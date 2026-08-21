#!/usr/bin/env ruby

require "cgi"
require "erb"
require "fileutils"
require "json"
require "time"

ROOT = File.expand_path("..", __dir__)
BASE_PATH = "/security"
SITE_ORIGIN = "https://jodyritonga.github.io"

class SiteBuilder
  def initialize
    @articles = JSON.parse(File.read(File.join(ROOT, "content", "data", "articles.json")))
    @discoveries = JSON.parse(File.read(File.join(ROOT, "content", "data", "discoveries.json")))
  end

  def h(value)
    CGI.escapeHTML(value.to_s)
  end

  def base(path = "/")
    normalized = path.start_with?("/") ? path : "/#{path}"
    normalized == "/" ? "#{BASE_PATH}/" : "#{BASE_PATH}#{normalized}"
  end

  def absolute(path = "/")
    "#{SITE_ORIGIN}#{base(path)}"
  end

  def format_date(value)
    Time.parse(value).strftime("%b %d, %Y")
  end

  def display_tag(tag)
    tag.to_s.split("-").map(&:capitalize).join(" ")
  end

  def article_href(article)
    base("/research/#{article.fetch("slug")}/")
  end

  def nav_link(label, path, key)
    active = @active_nav == key ? " is-active" : ""
    %(<a class="nav-link#{active}" href="#{base(path)}">#{h(label)}</a>)
  end

  def article_card(article, index: nil, compact: false)
    number = index ? format("%02d", index) : article.fetch("year")
    tags = article.fetch("tags").first(compact ? 2 : 3).map do |tag|
      %(<span>#{h(display_tag(tag))}</span>)
    end.join
    excerpt = compact ? "" : %(<p>#{h(article.fetch("excerpt"))}</p>)

    <<~HTML
      <article class="research-card#{compact ? " compact" : ""}">
        <div class="card-index">#{h(number)}</div>
        <div class="card-meta">
          <span>#{h(article.fetch("label"))}</span>
          <span>#{h(format_date(article.fetch("date")))}</span>
          <span>#{article.fetch("reading_time")} min read</span>
        </div>
        <h3><a href="#{article_href(article)}">#{h(article.fetch("title"))}</a></h3>
        #{excerpt}
        <div class="tag-row">#{tags}</div>
        <a class="text-link" href="#{article_href(article)}">Read the write-up <span aria-hidden="true">↗</span></a>
      </article>
    HTML
  end

  def discovery_row(discovery, index: nil)
    number = index ? format("%02d", index) : discovery.fetch("id")
    <<~HTML
      <article class="discovery-row">
        <div class="card-index">#{h(number)}</div>
        <div class="discovery-main">
          <div class="card-meta">
            <span>#{h(discovery.fetch("vendor"))}</span>
            <span>#{h(discovery.fetch("class"))}</span>
            <span>#{h(format_date(discovery.fetch("date")))}</span>
          </div>
          <h3>#{h(discovery.fetch("title"))}</h3>
          <p>#{h(discovery.fetch("summary"))}</p>
        </div>
        <div class="discovery-links">
          <a href="#{h(discovery.fetch("cve_url"))}" target="_blank" rel="noreferrer">#{h(discovery.fetch("id"))}</a>
          <a href="#{h(discovery.fetch("reference"))}" target="_blank" rel="noreferrer">Vendor advisory ↗</a>
        </div>
      </article>
    HTML
  end

  def render(template)
    path = File.join(ROOT, "templates", "#{template}.erb")
    ERB.new(File.read(path), trim_mode: "-").result(binding)
  end

  def write_page(output:, template:, title:, description:, active:, canonical:, body_class: "")
    @page_title = title
    @page_description = description
    @active_nav = active
    @canonical_path = canonical
    @body_class = body_class
    @content = render(template)
    destination = File.join(ROOT, output)
    FileUtils.mkdir_p(File.dirname(destination))
    File.write(destination, render("layout"))
  end

  def build_articles
    @articles.each do |article|
      @article = article
      @article_content = File.read(File.join(ROOT, article.fetch("content_file")))
      @related_articles = @articles.reject { |candidate| candidate.fetch("slug") == article.fetch("slug") }.first(3)
      write_page(
        output: File.join("research", article.fetch("slug"), "index.html"),
        template: "article",
        title: "#{article.fetch("title")} — Jody Ritonga",
        description: article.fetch("excerpt"),
        active: "research",
        canonical: "/research/#{article.fetch("slug")}/",
        body_class: "article-page"
      )
    end
  end

  def build_feeds
    routes = ["/", "/research/", "/discoveries/", "/notes/", "/method/", "/about/"]
    routes.concat(@articles.map { |article| "/research/#{article.fetch("slug")}/" })
    sitemap = routes.map { |route| "  <url><loc>#{h(absolute(route))}</loc></url>" }.join("\n")
    File.write(File.join(ROOT, "sitemap.xml"), %(<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n#{sitemap}\n</urlset>\n))

    items = @articles.map do |article|
      <<~XML
        <item>
          <title>#{h(article.fetch("title"))}</title>
          <link>#{h(absolute("/research/#{article.fetch("slug")}/"))}</link>
          <guid>#{h(absolute("/research/#{article.fetch("slug")}/"))}</guid>
          <pubDate>#{Time.parse(article.fetch("date")).rfc2822}</pubDate>
          <description>#{h(article.fetch("excerpt"))}</description>
        </item>
      XML
    end.join
    File.write(File.join(ROOT, "feed.xml"), %(<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Jody Ritonga Security Research</title><link>#{absolute("/")}</link><description>Independent vulnerability research across browser, mobile, and web application trust boundaries.</description>#{items}</channel></rss>\n))
    File.write(File.join(ROOT, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: #{absolute("/sitemap.xml")}\n")
  end

  def build
    @featured_articles = @articles.select { |article| article.fetch("collection") == "research" }.first(3)
    @research_articles = @articles.select { |article| article.fetch("collection") == "research" }
    @note_articles = @articles.select { |article| article.fetch("collection") == "notes" }

    write_page(
      output: "index.html",
      template: "home",
      title: "Jody Ritonga — Security Research",
      description: "Independent vulnerability research across browser, mobile, and web application trust boundaries, accelerated by LLMs and verified by reproducible evidence.",
      active: "home",
      canonical: "/",
      body_class: "home-page"
    )
    write_page(
      output: "research/index.html",
      template: "research",
      title: "Research — Jody Ritonga",
      description: "Technical vulnerability research and bug bounty write-ups with reproducible evidence.",
      active: "research",
      canonical: "/research/"
    )
    write_page(
      output: "discoveries/index.html",
      template: "discoveries",
      title: "Discoveries — Jody Ritonga",
      description: "Public CVE records and coordinated vulnerability disclosures across major browser engines.",
      active: "discoveries",
      canonical: "/discoveries/"
    )
    write_page(
      output: "notes/index.html",
      template: "notes",
      title: "Notes — Jody Ritonga",
      description: "CTF notes, payload studies, experiments, and smaller observations from ongoing security research.",
      active: "notes",
      canonical: "/notes/"
    )
    write_page(
      output: "method/index.html",
      template: "method",
      title: "Method — Jody Ritonga",
      description: "A human-led, LLM-accelerated vulnerability research workflow built around threat models, source-to-sink proof, and impact validation.",
      active: "method",
      canonical: "/method/"
    )
    write_page(
      output: "about/index.html",
      template: "about",
      title: "About — Jody Ritonga",
      description: "About Jody Ritonga, an independent browser, mobile, and web application security researcher based in Indonesia.",
      active: "about",
      canonical: "/about/"
    )
    write_page(
      output: "404.html",
      template: "not_found",
      title: "Page not found — Jody Ritonga",
      description: "The requested research page could not be found.",
      active: nil,
      canonical: "/404.html",
      body_class: "not-found-page"
    )
    build_articles
    build_feeds
    puts "Built #{@articles.length} articles and 7 site pages."
  end
end

SiteBuilder.new.build
