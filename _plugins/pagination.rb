# Paginate the existing home template without adding a runtime dependency.
module Jekyll
  class NotesPagination < Generator
    safe true
    priority :low

    def generate(site)
      template = site.pages.find { |page| page.name == "index.html" && page.dir == "/" }
      return unless template

      posts = site.posts.docs.reverse
      per_page = Integer(site.config.fetch("posts_per_page", 10))
      raise ArgumentError, "posts_per_page must be positive" unless per_page.positive?

      total_pages = [(posts.size.to_f / per_page).ceil, 1].max
      path_for = ->(number) { number == 1 ? "/" : "/page/#{number}/" }

      (1..total_pages).each do |number|
        page = site.pages.find { |candidate| candidate.url == path_for.call(number) }
        page ||= if number == 1
                   template
                 else
                 copy = PageWithoutAFile.new(site, site.source, "page/#{number}", "index.html")
                 copy.content = template.content
                 copy.data = template.data.dup
                 site.pages << copy
                 copy
                 end

        page.data["page_number"] = number

        page.data["paginator"] = {
          "page" => number,
          "posts" => posts.slice((number - 1) * per_page, per_page),
          "total_posts" => posts.size,
          "total_pages" => total_pages,
          "previous_page_path" => number > 1 ? path_for.call(number - 1) : nil,
          "next_page_path" => number < total_pages ? path_for.call(number + 1) : nil,
          "pages" => (1..total_pages).map { |n| { "number" => n, "path" => path_for.call(n) } }
        }
      end
    end
  end
end
