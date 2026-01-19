#!/usr/bin/env ruby
require 'json'
require 'net/http'
require 'uri'
require 'openssl'
require 'base64'
require 'time'

# Configuration
SCRIPT_DIR = File.dirname(__FILE__)
API_KEY_PATH = File.join(SCRIPT_DIR, '..', 'certs', 'ios-store', 'app_store_auth.json')
BACKEND_API_URL = 'https://coach-vocab-api-prod-1068204580938.asia-east1.run.app'
BUNDLE_ID = 'com.amazingtalker.aicoach'
PASSWORD = '12345678'

# Colors
class String
  def green;  "\e[32m#{self}\e[0m" end
  def yellow; "\e[33m#{self}\e[0m" end
  def red;    "\e[31m#{self}\e[0m" end
end

def log_info(msg);  $stderr.puts "[INFO]".green + " #{msg}"; end
def log_warn(msg);  $stderr.puts "[WARN]".yellow + " #{msg}"; end
def log_error(msg); $stderr.puts "[ERROR]".red + " #{msg}"; end

# Load API key
def load_api_key
  JSON.parse(File.read(API_KEY_PATH))
rescue => e
  log_error "Failed to load API key: #{e.message}"
  exit 1
end

# Generate JWT for App Store Connect API
def generate_jwt(api_key)
  key_id = api_key['key_id']
  issuer_id = api_key['issuer_id']
  private_key_content = api_key['key']

  header = {
    alg: 'ES256',
    kid: key_id,
    typ: 'JWT'
  }

  now = Time.now.to_i
  payload = {
    iss: issuer_id,
    iat: now,
    exp: now + 1200,  # 20 minutes
    aud: 'appstoreconnect-v1'
  }

  # Encode header and payload
  header_encoded = Base64.urlsafe_encode64(header.to_json, padding: false)
  payload_encoded = Base64.urlsafe_encode64(payload.to_json, padding: false)

  # Sign with ES256
  signing_input = "#{header_encoded}.#{payload_encoded}"
  private_key = OpenSSL::PKey::EC.new(private_key_content)
  signature = private_key.sign('SHA256', signing_input)

  # Convert DER signature to raw r||s format (64 bytes)
  asn1 = OpenSSL::ASN1.decode(signature)
  r = asn1.value[0].value.to_s(2).rjust(32, "\x00")[-32, 32]
  s = asn1.value[1].value.to_s(2).rjust(32, "\x00")[-32, 32]
  raw_signature = r + s

  signature_encoded = Base64.urlsafe_encode64(raw_signature, padding: false)

  "#{signing_input}.#{signature_encoded}"
end

# Make API request to App Store Connect
def appstore_api_get(jwt, path)
  uri = URI("https://api.appstoreconnect.apple.com#{path}")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  request = Net::HTTP::Get.new(uri)
  request['Authorization'] = "Bearer #{jwt}"
  request['Content-Type'] = 'application/json'

  response = http.request(request)
  JSON.parse(response.body)
rescue => e
  log_error "API request failed: #{e.message}"
  nil
end

# Get app ID from bundle ID
def get_app_id(jwt)
  response = appstore_api_get(jwt, "/v1/apps?filter[bundleId]=#{BUNDLE_ID}")

  if response.nil? || response['errors']
    log_error "Could not find app: #{response&.dig('errors', 0, 'detail') || 'Unknown error'}"
    exit 1
  end

  app_id = response.dig('data', 0, 'id')
  if app_id.nil?
    log_error "No app found with bundle ID: #{BUNDLE_ID}"
    exit 1
  end

  app_id
end

# Get latest app store version ID
def get_latest_version_id(jwt, app_id)
  response = appstore_api_get(jwt, "/v1/apps/#{app_id}/appStoreVersions?limit=1")

  if response.nil? || response['errors']
    log_error "Could not get app versions: #{response&.dig('errors', 0, 'detail') || 'Unknown error'}"
    exit 1
  end

  version_id = response.dig('data', 0, 'id')
  if version_id.nil?
    log_error "No app store version found"
    exit 1
  end

  version_id
end

# Get app review credentials
def get_review_credentials(jwt, version_id)
  response = appstore_api_get(jwt, "/v1/appStoreVersions/#{version_id}/appStoreReviewDetail")

  if response.nil? || response['errors']
    log_warn "Could not get review details: #{response&.dig('errors', 0, 'detail') || 'Unknown error'}"
    return nil
  end

  demo_user = response.dig('data', 'attributes', 'demoAccountName')
  demo_pass = response.dig('data', 'attributes', 'demoAccountPassword')

  if demo_user && !demo_user.empty? && demo_pass && !demo_pass.empty?
    { email: demo_user, password: demo_pass }
  else
    nil
  end
end

# Fetch credentials from App Store Connect
def fetch_appstore_credentials
  log_info "Fetching current demo credentials from App Store Connect..."

  api_key = load_api_key
  jwt = generate_jwt(api_key)

  app_id = get_app_id(jwt)
  log_info "Found app ID: #{app_id}"

  version_id = get_latest_version_id(jwt, app_id)
  log_info "Found version ID: #{version_id}"

  get_review_credentials(jwt, version_id)
end

# Check if account works by attempting login
def check_account_works(email, password)
  log_info "Checking if account works: #{email}"

  uri = URI("#{BACKEND_API_URL}/api/auth/login")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  request = Net::HTTP::Post.new(uri)
  request['Content-Type'] = 'application/json'
  request.body = { email: email, password: password }.to_json

  response = http.request(request)

  if response.code == '200'
    log_info "Account is valid"
    true
  else
    log_warn "Account login failed (HTTP #{response.code})"
    false
  end
rescue => e
  log_warn "Login check failed: #{e.message}"
  false
end

# Create a new review account
def create_new_account
  timestamp = Time.now.strftime('%Y%m%d%H%M%S')
  email = "jacky+ios_test-#{timestamp}@amazingtalker.com"
  username = "ios_review_#{timestamp}"

  log_info "Creating new review account: #{email}"

  uri = URI("#{BACKEND_API_URL}/api/auth/register")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  request = Net::HTTP::Post.new(uri)
  request['Content-Type'] = 'application/json'
  request.body = { email: email, username: username, password: PASSWORD }.to_json

  response = http.request(request)

  if ['200', '201'].include?(response.code)
    log_info "Account created successfully"
    { email: email, password: PASSWORD }
  else
    log_error "Failed to create account (HTTP #{response.code}): #{response.body}"
    exit 1
  end
rescue => e
  log_error "Account creation failed: #{e.message}"
  exit 1
end

# Update App Store Connect with demo credentials using fastlane
def update_app_store(email, password)
  unless File.exist?(API_KEY_PATH)
    log_error "App Store API key not found at #{API_KEY_PATH}"
    exit 1
  end

  log_info "Updating App Store Connect demo credentials..."

  # Use Fastlane's Ruby API directly
  require 'fastlane'

  Fastlane::Actions::DeliverAction.run(
    api_key_path: API_KEY_PATH,
    app_review_information: {
      demo_user: email,
      demo_password: password
    },
    skip_binary_upload: true,
    skip_screenshots: true,
    skip_metadata: true,
    force: true
  )

  log_info "App Store Connect updated"
rescue => e
  log_error "Failed to update App Store Connect: #{e.message}"
  exit 1
end

# Main
def main
  update_store = ARGV.include?('--update-store')
  force_new = ARGV.include?('--force-new')

  credentials = nil

  if force_new
    log_info "Force creating new account..."
    credentials = create_new_account
  else
    # Try to fetch current credentials from App Store Connect
    appstore_creds = fetch_appstore_credentials

    if appstore_creds
      log_info "Found credentials in App Store Connect: #{appstore_creds[:email]}"

      if check_account_works(appstore_creds[:email], appstore_creds[:password])
        log_info "Existing App Store credentials are valid"
        credentials = appstore_creds
      else
        log_warn "App Store credentials don't work, creating new account..."
        credentials = create_new_account
        update_store = true  # Auto-update since we created new account
      end
    else
      log_warn "No credentials in App Store Connect, creating new account..."
      credentials = create_new_account
      update_store = true  # Auto-update since we created new account
    end
  end

  if update_store
    update_app_store(credentials[:email], credentials[:password])
  end

  log_info "Review account ready: #{credentials[:email]} / #{credentials[:password]}"
end

main
