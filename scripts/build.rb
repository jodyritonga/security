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

  def discovery_card(discovery, index: nil)
    number = index ? format("%02d", index) : discovery.fetch("id")
    <<~HTML
      <article class="card" id="#{h(discovery.fetch("id").downcase)}">
        <span class="pin" aria-hidden="true"></span>
        <span class="card-index" aria-hidden="true">#{h(number)}</span>
        <div class="card-meta">
          <span class="vendor">#{h(discovery.fetch("vendor"))}</span>
          <span>#{h(discovery.fetch("class"))}</span>
          <time datetime="#{h(discovery.fetch("date"))}">#{h(format_date(discovery.fetch("date")))}</time>
        </div>
        <h3>#{h(discovery.fetch("title"))}</h3>
        <p>#{h(discovery.fetch("summary"))}</p>
        <div class="card-links">
          <a class="pill pill-cve" href="#{h(discovery.fetch("cve_url"))}" target="_blank" rel="noreferrer">#{h(discovery.fetch("id"))} <span aria-hidden="true">↗</span></a>
          <a class="pill" href="#{h(discovery.fetch("reference"))}" target="_blank" rel="noreferrer">Vendor note <span aria-hidden="true">↗</span></a>
        </div>
      </article>
    HTML
  end

  def ticker
    vendors = @discoveries.map { |d| d.fetch("vendor") }.uniq.sort
    items = ["<b>#{format('%02d', @discoveries.length)}</b> public CVE disclosures"]
    items.concat(vendors.map { |v| h(v) })
    items.concat(@discoveries.map { |d| "<b>#{h(d.fetch('id'))}</b> #{h(d.fetch('product'))}" })
    items << "Browser &amp; Android security"
    items << "Reproducible evidence, responsibly disclosed"
    items << "Tangerang, Indonesia"
    track = (items * 2).map { |item| "<span>#{item}</span>" }.join
    %(<div class="ticker" aria-hidden="true"><div class="ticker-track">#{track}</div></div>)
  end

  def practice_steps
    <<~HTML
      <ol class="triptych-steps reveal">
        <li><span class="step-mark" aria-hidden="true">I</span><span class="section-number">Observe</span><h3>Follow the boundaries.</h3><p>Trace how applications handle trust, and where an assumption starts to break.</p></li>
        <li><span class="step-mark" aria-hidden="true">II</span><span class="section-number">Verify</span><h3>Make the proof clear.</h3><p>Build focused tools and reproducible tests that show what an attacker can actually do.</p></li>
        <li><span class="step-mark" aria-hidden="true">III</span><span class="section-number">Disclose</span><h3>Help the fix happen.</h3><p>Share precise evidence, explain the impact, and work through responsible disclosure.</p></li>
      </ol>
    HTML
  end

  def contact_band
    <<~HTML
      <section class="contact-band">
        <div class="contact-field" aria-hidden="true"></div>
        <div class="shell contact-grid">
          <div class="reveal"><span class="section-number">Good work starts with a conversation</span><h2>Something worth<br><em>looking into?</em></h2><p>Security research, source review, or something useful we could build together.</p><a class="contact-mail" href="mailto:jodyritonga@gmail.com">jodyritonga@gmail.com</a></div>
          <div class="contact-side reveal"><img src="#{base('/assets/images/editorial/flying-letter.svg')}" width="400" height="320" alt="A winged letter." loading="lazy"><div class="contact-links"><a class="pill" href="https://github.com/jodyritonga" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a><a class="pill" href="https://www.linkedin.com/in/jodyritonga" target="_blank" rel="noreferrer">LinkedIn <span aria-hidden="true">↗</span></a></div></div>
        </div>
      </section>
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
