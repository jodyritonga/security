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
    @discoveries = JSON.parse(File.read(File.join(ROOT, "content", "data", "discoveries.json")))
    @writeups = [] # Draft write-ups stay local until publication is authorized.
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

  def nav_link(label, path, key)
    active = @active_nav == key ? " is-active" : ""
    current = @active_nav == key ? ' aria-current="page"' : ""
    %(<a class="nav-link#{active}" href="#{base(path)}"#{current}>#{h(label)}</a>)
  end

  def discovery_row(discovery, index: nil)
    number = index ? format("%02d", index) : discovery.fetch("id")
    <<~HTML
      <article class="discovery-row" id="#{h(discovery.fetch("id").downcase)}">
        <div class="card-index">#{h(number)} <span aria-hidden="true">↘</span></div>
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
          <a href="#{h(discovery.fetch("cve_url"))}" target="_blank" rel="noreferrer">#{h(discovery.fetch("id"))} ↗</a>
          <a href="#{h(discovery.fetch("reference"))}" target="_blank" rel="noreferrer">Vendor note ↗</a>
        </div>
      </article>
    HTML
  end

  def render(template)
    path = File.join(ROOT, "templates", "#{template}.erb")
    ERB.new(File.read(path), trim_mode: "-").result(binding)
  end

  def write_page(output:, template:, title:, description:, active:, canonical:, body_class: "", social_image: nil, og_type: "website", article: nil)
    @page_title = title
    @page_description = description
    @active_nav = active
    @canonical_path = canonical
    @body_class = body_class
    @social_image = social_image
    @og_type = og_type
    @article = article
    @content = render(template)
    destination = File.join(ROOT, output)
    FileUtils.mkdir_p(File.dirname(destination))
    File.write(destination, render("layout"))
  end

  def build_feeds
    routes = ["/", "/discoveries/", "/method/", "/about/"]
    routes.concat(@writeups.map { |writeup| "/blog/#{writeup.fetch("slug")}/" })
    sitemap = routes.map { |route| "  <url><loc>#{h(absolute(route))}</loc></url>" }.join("\n")
    File.write(File.join(ROOT, "sitemap.xml"), %(<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n#{sitemap}\n</urlset>\n))

    writeup_items = @writeups.map do |writeup|
      article_url = absolute("/blog/#{writeup.fetch("slug")}/")
      <<~XML
        <item>
          <title>#{h(writeup.fetch("title"))}</title>
          <link>#{h(article_url)}</link>
          <guid>#{h(article_url)}</guid>
          <pubDate>#{Time.parse(writeup.fetch("date")).rfc2822}</pubDate>
          <description>#{h(writeup.fetch("excerpt"))}</description>
        </item>
      XML
    end

    discovery_items = @discoveries.map do |discovery|
      record_url = absolute("/discoveries/##{discovery.fetch("id").downcase}")
      <<~XML
        <item>
          <title>#{h(discovery.fetch("id"))}: #{h(discovery.fetch("title"))}</title>
          <link>#{h(record_url)}</link>
          <guid>#{h(record_url)}</guid>
          <pubDate>#{Time.parse(discovery.fetch("date")).rfc2822}</pubDate>
          <description>#{h(discovery.fetch("summary"))}</description>
        </item>
      XML
    end
    items = (writeup_items + discovery_items).join
    File.write(File.join(ROOT, "feed.xml"), %(<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Jody Ritonga — Security Research</title><link>#{absolute("/discoveries/")}</link><description>Public CVE records and coordinated vulnerability disclosures by Jody Ritonga.</description>#{items}</channel></rss>\n))
    File.write(File.join(ROOT, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: #{absolute("/sitemap.xml")}\n")
  end

  def unpublish_blog
    FileUtils.rm_rf(File.join(ROOT, "research"))
    FileUtils.rm_rf(File.join(ROOT, "notes"))
  end

  def build
    unpublish_blog

    write_page(
      output: "index.html",
      template: "home",
      title: "Jody Ritonga — Security Researcher & Builder",
      description: "The personal portfolio of Jody Ritonga, an independent security researcher and builder in Indonesia.",
      active: "home",
      canonical: "/",
      body_class: "home-page"
    )
    write_page(
      output: "discoveries/index.html",
      template: "discoveries",
      title: "Selected Work — Jody Ritonga",
      description: "Public CVE records and coordinated vulnerability disclosures by Jody Ritonga.",
      active: "discoveries",
      canonical: "/discoveries/"
    )
    @writeups.each do |writeup|
      @article_content = File.read(File.join(ROOT, writeup.fetch("content_file")))
      write_page(
        output: "blog/#{writeup.fetch("slug")}/index.html",
        template: "article",
        title: "#{writeup.fetch("title")} — Jody Ritonga",
        description: writeup.fetch("excerpt"),
        active: "blog",
        canonical: "/blog/#{writeup.fetch("slug")}/",
        body_class: "article-page",
        social_image: writeup.fetch("cover"),
        og_type: "article",
        article: writeup
      )
    end
    write_page(
      output: "method/index.html",
      template: "method",
      title: "Process — Jody Ritonga",
      description: "How Jody Ritonga approaches human-led, LLM-assisted vulnerability research and evidence-driven validation.",
      active: "method",
      canonical: "/method/"
    )
    write_page(
      output: "about/index.html",
      template: "about",
      title: "About — Jody Ritonga",
      description: "About Jody Ritonga, an independent browser, mobile, and web application security researcher in Indonesia.",
      active: "about",
      canonical: "/about/"
    )
    write_page(
      output: "404.html",
      template: "not_found",
      title: "Page not found — Jody Ritonga",
      description: "The requested portfolio page could not be found.",
      active: nil,
      canonical: "/404.html",
      body_class: "not-found-page"
    )
    build_feeds
    puts "Built Jody Ritonga portfolio with #{@discoveries.length} public records and #{@writeups.length} write-up."
  end
end

SiteBuilder.new.build
