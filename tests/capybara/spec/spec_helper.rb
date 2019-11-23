require 'rspec'
require 'capybara/rspec'
require 'capybara/dsl'

Capybara.run_server = false

Capybara.default_driver = :selenium
Capybara.app_host = "http://localhost:8000";

browser = Capybara.current_session


browser.visit "/"


print "once"

module Helpers
  module Authentication
    def set_cookie()
      strVar = File.open('cookie.txt', &:readline)
      Capybara.current_session.driver.browser.manage.add_cookie :name => "user", :value => strVar.strip
      # here is where you can put the steps to fill out the log in form
    end
  end
end

RSpec.configure do |config|
  config.before(:each) do
    config.include Capybara::DSL
    config.include Helpers::Authentication
  end
  config.after(:each) do
    Capybara.current_session.instance_variable_set(:@touched, false)
  end
end




