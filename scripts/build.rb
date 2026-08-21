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
    %(<a class="nav-link#{active}" href="#{base(path)}">#{h(label)}</a>)
  end

  def discovery_row(discovery, index: nil)
    number = index ? format("%02d", index) : discovery.fetch("id")
    <<~HTML
      <article class="discovery-row" id="#{h(discovery.fetch("id").downcase)}">
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

  def build_feeds
    routes = ["/", "/discoveries/", "/method/", "/about/"]
    sitemap = routes.map { |route| "  <url><loc>#{h(absolute(route))}</loc></url>" }.join("\n")
    File.write(File.join(ROOT, "sitemap.xml"), %(<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n#{sitemap}\n</urlset>\n))

    items = @discoveries.map do |discovery|
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
    end.join
    File.write(File.join(ROOT, "feed.xml"), %(<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>RETAK Security CVE Record</title><link>#{absolute("/discoveries/")}</link><description>Public CVE records and coordinated disclosures from RETAK Security.</description>#{items}</channel></rss>\n))
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
      title: "RETAK Security — Public CVE Record",
      description: "The coordinated CVE record of RETAK Security across browser and mobile trust boundaries.",
      active: "home",
      canonical: "/",
      body_class: "home-page"
    )
    write_page(
      output: "discoveries/index.html",
      template: "discoveries",
      title: "CVE Record — RETAK Security",
      description: "Public CVE records and coordinated vulnerability disclosures across major browser engines.",
      active: "discoveries",
      canonical: "/discoveries/"
    )
    write_page(
      output: "method/index.html",
      template: "method",
      title: "Method — RETAK Security",
      description: "A human-led, LLM-accelerated vulnerability research workflow built around threat models, source-to-sink proof, and impact validation.",
      active: "method",
      canonical: "/method/"
    )
    write_page(
      output: "about/index.html",
      template: "about",
      title: "About — RETAK Security",
      description: "About RETAK Security, an independent browser, mobile, and web application security research studio based in Indonesia.",
      active: "about",
      canonical: "/about/"
    )
    write_page(
      output: "404.html",
      template: "not_found",
      title: "Page not found — RETAK Security",
      description: "The requested research page could not be found.",
      active: nil,
      canonical: "/404.html",
      body_class: "not-found-page"
    )
    build_feeds
    puts "Built CVE-only site with #{@discoveries.length} public records."
  end
end

SiteBuilder.new.build
