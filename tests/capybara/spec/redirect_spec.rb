require "spec_helper"

describe 'redirects from login if logged in' do
  it "redirect" do
    visit("/")
    set_cookie()
    visit("/login")
    expect(page).to have_current_path("/")
  end
end
