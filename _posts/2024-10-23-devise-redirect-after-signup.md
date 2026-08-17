---
layout: post
title: "devise 如何註冊後跳轉至指定頁面"
date: 2024-10-23 00:00:00 +0800
slug: "devise-redirect-after-signup"
tags: ["學習與轉譯工坊"]
lang: "zh-TW"
published: true
---
## 情境

最近想要實現註冊之後跳轉回專案頁面的功能，目前知道的是「登入」之後會成功跳轉，但註冊卻沒辦法。

記錄一下順 devise 的脈絡（參照這篇：https://github.com/heartcombo/devise/wiki/How-To:-Redirect-back-to-current-page-after-sign-in,-sign-out,-sign-up,-update#a-simpler-solution ）

---
首先是我們 application_controller 有一個 `store_user_location!` 的 before_action：

```ruby!

before_action :store_user_location!, if: :storable_location?

def store_user_location!
  # :user is the scope we are authenticating
  store_location_for(:user, params[:return_to] || request.fullpath)
end
```

註冊連結這樣寫，上面的方法就會將 `params[:return_to]` 存到 session 裡面：

```ruby!
new_user_registration_path(return_to: project_path(@project, s: params[:s]))
```

中途用 puts debug 了一下，確定我們到註冊頁面的時候 `stored_location_for(resource)` 是有存到値的，但不知道為什麼沒有成功跳轉。

查到了[這篇 Stackoverflow](https://stackoverflow.com/questions/8003347/overriding-devise-after-sign-up-path-for-not-working/9253202#9253202)，原來是因為我們有用 `Confirmable`（註冊後需確認才算成功註冊），因此對 devise 而言使用者其實還沒成功「sign_up」，還是 inactive 的未完成狀態 😂 因此要特別加上 `after_inactive_sign_up_path_for`

```ruby!
def after_inactive_sign_up_path_for(resource)
  stored_location_for(resource) || user_path(resource)
end

def after_sign_up_path_for(resource)
  stored_location_for(resource) || user_path(resource)
end
```
---
原：[https://hackmd.io/@tyliatw/SJAs2E8eyx](https://hackmd.io/@tyliatw/SJAs2E8eyx)