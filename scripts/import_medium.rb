#!/usr/bin/env ruby

require "fileutils"
require "json"
require "nokogiri"
require "open-uri"
require "rexml/document"
require "time"
require "uri"

ROOT = File.expand_path("..", __dir__)
FEED_URL = "https://medium.com/feed/@jodyritonga"
BASE_PATH = "/security"
USER_AGENT = "RetakResearchArchive/1.0"

def slugify(value)
  value
    .encode("ASCII", invalid: :replace, undef: :replace, replace: "")
    .downcase
    .gsub(/[^a-z0-9]+/, "-")
    .gsub(/\A-|\-\z/, "")
end

def clean_url(value)
  uri = URI(value)
  uri.query = nil if uri.query&.include?("source=rss")
  uri.to_s
rescue URI::InvalidURIError
  value
end

def image_extension(content_type, source)
  return ".png" if content_type == "image/png"
  return ".gif" if content_type == "image/gif"
  return ".webp" if content_type == "image/webp"
  return ".svg" if content_type == "image/svg+xml"
  return ".jpg" if content_type == "image/jpeg"

  extension = File.extname(URI(source).path).downcase
  %w[.jpg .jpeg .png .gif .webp].include?(extension) ? extension : ".jpg"
rescue URI::InvalidURIError
  ".jpg"
end

def download_image(source, directory, index)
  response = URI.open(source, "User-Agent" => USER_AGENT)
  extension = image_extension(response.content_type, source)
  filename = format("%02d%s", index + 1, extension)
  path = File.join(directory, filename)
  File.binwrite(path, response.read)
  filename
rescue OpenURI::HTTPError, SocketError, URI::InvalidURIError, Errno::ECONNRESET => error
  warn "Could not download #{source}: #{error.message}"
  nil
end

def classify(title)
  title.match?(/ctf|payload/i) ? ["notes", "Lab note"] : ["research", "Research write-up"]
end

xml = URI.open(FEED_URL, "User-Agent" => USER_AGENT).read
feed = REXML::Document.new(xml)
article_directory = File.join(ROOT, "content", "articles")
image_root = File.join(ROOT, "assets", "images", "posts")
FileUtils.mkdir_p(article_directory)
FileUtils.mkdir_p(image_root)

articles = []

feed.elements.each("rss/channel/item") do |item|
  title = item.elements["title"].text.strip
  date = Time.parse(item.elements["pubDate"].text).utc
  original_url = clean_url(item.elements["link"].text.strip)
  raw_content = item.elements["content:encoded"].text.to_s
  categories = item.get_elements("category").map { |category| category.text.to_s.strip }.reject(&:empty?)
  slug = slugify(title)
  collection, label = classify(title)
  fragment = Nokogiri::HTML.fragment(raw_content)
  image_directory = File.join(image_root, slug)
  FileUtils.mkdir_p(image_directory)

  fragment.css("script, style").remove
  fragment.css("img").each_with_index do |image, index|
    source = image["src"].to_s
    if source.include?("medium.com/_/stat") || image["width"] == "1"
      image.remove
      next
    end

    filename = download_image(source, image_directory, index)
    image["src"] = "#{BASE_PATH}/assets/images/posts/#{slug}/#{filename}" if filename
    image["alt"] = "Figure from #{title}" if image["alt"].to_s.strip.empty?
    image["loading"] = "lazy"
    image["decoding"] = "async"
  end

  fragment.css("a[href]").each do |anchor|
    anchor["href"] = clean_url(anchor["href"])
    next unless anchor["href"].start_with?("http")

    anchor["target"] = "_blank"
    anchor["rel"] = "noreferrer"
  end

  fragment.css("h4").each { |heading| heading.name = "h2" }
  fragment.css("pre").each { |block| block["tabindex"] = "0" }
  fragment.css("p").each do |paragraph|
    paragraph.remove if paragraph.text.strip.empty? || paragraph.text.match?(/was originally published in/i)
  end

  excerpt = fragment.at_css("p")&.text.to_s.strip.gsub(/\s+/, " ")
  excerpt = excerpt[0, 240].sub(/\s+\S*\z/, "") + "…" if excerpt.length > 240
  word_count = fragment.text.split.size
  reading_time = [(word_count / 220.0).ceil, 1].max

  File.write(File.join(article_directory, "#{slug}.html"), fragment.to_html)

  articles << {
    "slug" => slug,
    "title" => title,
    "date" => date.strftime("%Y-%m-%d"),
    "year" => date.year,
    "collection" => collection,
    "label" => label,
    "excerpt" => excerpt,
    "reading_time" => reading_time,
    "tags" => categories.first(5),
    "original_url" => original_url,
    "original_host" => URI(original_url).host,
    "content_file" => "content/articles/#{slug}.html"
  }
end

articles.sort_by! { |article| article["date"] }.reverse!
File.write(File.join(ROOT, "content", "data", "articles.json"), JSON.pretty_generate(articles) + "\n")
puts "Imported #{articles.length} Medium articles."
