---
layout: post
title: "Rack::Attack 實作 Rate Limit"
date: 2024-09-02 23:47:00 +0800
slug: "rack-attack-rate-limit"
tags: ["學習與轉譯工坊"]
lang: "zh-TW"
published: true
---
## 情境

最近在公司要寫一個寄送驗證信的功能，為了避免這功能被用來亂炸不知名路人的信箱，我們要加上限流的機制，例如 24 小時內寄送 5 封就會跳錯誤。

第一個想到的做法是使用 Redis 自己寫計數器，但又想想這件事沒道理 Rails community 會沒有一個解法，所以想先調查一下再來進行。

果不其然被我找到一個叫做 [rack-attack](https://github.com/rack/rack-attack) 的 gem，看起來完全是我需要的東西。

## 實作

照著技術文件新增了 config/initializers/rack_attack.rb

```ruby!
Rack::Attack.throttle('limit confirmation request per session', limit: 5, period: 24.hours) do |req|
  if req.path == '/users/confirmation' && req.post?
    req.env['rack.session'].id
  end
end
```
同一個電信商可能會是相同 IP，如果多人在同一個位置操作這個頁面就會被誤判到達寄送上限，因此用 session id 來識別是否限流比較準確。

POST 的地方判斷一下 429（Too Many Requests）錯誤：
```javascript!
Rails.ajax({
  url: '/users/confirmation',
  type: 'POST',
  data: userData,
  success: function () {
    replaceText(true)
  },
  error: function (status, error, xhr) {
    if (xhr.status === 429) {
      replaceText(false, '寄送次數到達上限，請 24 小時後再重試')
    } else {
      replaceText(false)
    }
  }
```

開始嘗試跑了之後可以感覺到它⋯⋯沒有在計數，哈哈哈哈哈。不管怎麼重整都可以順利寄出信件。

翻了翻 Rack::Attack 的文件，看到它寫說它的機制是存在 cache 裡面，我第一個懷疑的是 development 環境有沒有可能沒有開啟 cache？

帶著這樣的疑問廣搜了一下為什麼它 not working，找到這篇：

https://stackoverflow.com/questions/35787771/rails-attempting-to-throttle-my-api-with-rack-attack-unsure-if-its-working

> should enable dev cache first
By default rails development cache is disable.
Should be enable in the console with rails dev:cache in order for Rack Attack to start working.

不過確實我也在 development.rb 找到：

```ruby!
# Enable/disable caching. By default caching is disabled.
# Run rails dev:cache to toggle caching.

if Rails.root.join('tmp/caching-dev.txt').exist?
  config.action_controller.perform_caching = true
...
```

故事告訴我們答案常常是遠在天邊近在眼前。下次記得先找 code baseＸＤ

---

開啟之後感覺它有在跳錯誤了！（灑花

不過接下來發生的事情是什麼呢，我可以感覺到 Rack::Attack 的限流有在作用，但大概是偶爾有偶爾沒有。

例如我設定了超過五次就會限流，但可以感覺到我重整之後有時會跳限流錯誤，下一次又會正常運作。

以前常常遇到這種有時有有時沒有的劇情通常都是 race condition 的問題，跟這個有一滴滴滴像，相似的地方就是參與者（process）大於 1 的時候會發生。

這時候我就注意到我們 rails s 的 log 寫著

```ruby!
{"puma":{"started":1723705678,"time":1723706028,"workers":8,"queues":0,"threads":40,"capacity":40,"requests":114}}
```

跟 ChatGPT 討論了一下我的猜測：
me:
> my throttle sometimes work sometimes not
> does this have to do anything with it?
> {"puma":{"started":1723705678,"time":1723706028,"workers":8,"queues":0,"threads":40,"capacity":40,"requests":114}}

ChatGPT:
> The issue where your throttle sometimes works and sometimes doesn't could indeed be related to your Puma server configuration, particularly if you're running multiple workers or threads.
> 
> ### Understanding the Configuration:
> Puma Workers: Each Puma worker is a separate process. If you have 8 workers, you have 8 independent processes running your Rails application.
> 
> Puma Threads: Each worker can handle multiple threads (in this case, 5 threads per worker, given 40 threads across 8 workers).
> 
> ### How This Affects Throttling:
> 
> Rack::Attack and Thread Safety: Rack::Attack uses the cache store (like Redis or Memcached) to store request counts and timestamps to enforce rate limits. If your rate limiting logic is dependent on the application’s in-memory state and you’re not using a centralized cache, the requests can be counted separately by each worker, leading to inconsistent throttling behavior.
> 
> Centralized Cache Required: For consistent throttling across multiple workers, you need to use a centralized cache store (e.g., Redis) that all Puma workers and threads can access. Without this, each worker will maintain its own counter, and the throttle might seem inconsistent.
> 
> ### Potential Solutions:
> 
> Use a Centralized Cache (Recommended):
> 
> Configure your Rails application to use Redis or another centralized cache store. This ensures all workers and threads are reading and writing to the same cache, making rate limiting consistent.
> 
> ```ruby!
> config/environments/production.rb or development.rb config.cache_store = :redis_cache_store, { url: 'redis://localhost:6379/1' }
> ```

內～跟自己說一聲 nice guess！

但還是想知道所以我們現在在用什麼 cache？這時候先 output

```ruby!
puts "Rack::Attack is using cache store: #{Rack::Attack.cache.store}"
```

就得到了

```ruby!
Rack::Attack is using cache store: #<ActiveSupport::Cache::MemoryStore:0x000000010c6a0dd0>
```

查一下 [ActiveSupport::Cache::MemoryStore](https://api.rubyonrails.org/v7.1.3.4/classes/ActiveSupport/Cache/MemoryStore.html) 看到它寫

> Memory Cache Store
> 
> A cache store implementation which stores everything into memory in the same process. If you’re running multiple Ruby on Rails server processes (which is the case if you’re using Phusion Passenger or puma clustered mode), **then this means that Rails server process instances won’t be able to share cache data with each other and this may not be the most appropriate cache in that scenario.**

登愣！不同 process 不會共享同個 cache，這樣每次 request 就不會計在一起，也就會造成偶爾有達到 limit 偶爾沒有。

這時候就是像 ChatGPT 所說，統一指定 Rack::Attack 統一用 redis 即可：

> Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(url: ENV.fetch('THROTTLING_REDIS_URL', 'redis://localhost:6379/0'))

---


另一個 update 的地方由於不是 ajax 打而是 form submit，我想要達到的效果是 update 之後可以 redirect 跳 flash error「您已達到寄送上限」。

Rack::Attack 的 default response 是回傳 429，但也是可以客製化想要的 status code 跟回傳內容。

直接指定 response 的使用方法像這樣：

```ruby!
Rack::Attack.throttled_responder = lambda do |request|
  # 這裡回傳這個 request 符合的是哪個 throttle 情境
  match_throttle = request.env['rack.attack.matched']

  # 就可以在這裡判斷不同情境想要什麼樣的 response
  case match_throttle
  when 'limit update request per user'
    path = request.env['HTTP_REFERER']
    session = request.env['rack.session']
    session[:throttled] = true

    [302, { 'Location' => path }, ['Throttled']]
  else
    [429, {}, ['Throttled']]
  end
end
```

`session[:throttled] = true` 的部分是回到 controller 的時候可以判別這個 request 是一個被限流的 request，這樣可以在 controller 判斷限流要顯示 flash error：

```ruby!
def edit
  if session[:throttled]
    flash.now[:error] = '您已經超過請求次數限制，請稍後再試。'
    session.delete(:throttled)
  end

...
```

## Rspec

Rack::Attack 要寫 request 類型的 rspec，一般來說直接模擬 request，超過次數之後再驗證對應的 response 即可。

但我遇到一個問題：在 middleware 拿到的 session 是 nil，我用 session 來識別是否限流的地方就會爆掉。但為什麼跑 Rspec 會沒有 session？

找到這篇：

https://gist.github.com/dteoh/99721c0321ccd18286894a962b5ce584

> One of the issues with using type: :request is that you lose the ability to set session variables before issuing a request. Integration tests assume that you will always start a test from an initial state, and mutate the state by issuing requests. 

最後這樣 mock：

```
allow_any_instance_of(Rack::Attack::Request).to receive(:env).and_return({ 'rack.session' => MockSession.new })

# ...

class MockSession
  attr_accessor :id, :data

  def initialize(id = SecureRandom.hex(16))
    @id = id
    @data = {}
  end

  def [](key)
    @data[key]
  end

  def []=(key, value)
    @data[key] = value
  end
end
```

---

如果你有任何想法，歡迎留言或寄信到 tyliayu@gmail.com 跟我交流 :sparkles: 