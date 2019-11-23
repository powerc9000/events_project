require "spec_helper"

describe 'event creation' do
  it "can visit" do
    set_cookie()
    visit("/create")
    expect(page).to have_current_path("/create")
  end
end
