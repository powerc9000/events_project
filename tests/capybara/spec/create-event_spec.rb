require "spec_helper"

describe 'event creation' do
  it "can visit" do
    visit("/")
    set_cookie()
    visit("/create")
    expect(page).to have_current_path("/create")
  end
  it "can create event" do
    visit("/")
    set_cookie()
    visit("/create")
    first('input#event-start-date').set((Date.today+1).strftime("%Y-%m-%d"))
    first('input#event-start-time').set("12:12")
    first('input#event-name').set("Test")
    first("trix-editor").set("Test")
    click_button "Create Event"
    sleep 1
    expect(current_url).to include("/events/test");
  end
end

describe 'view event' do
  before(:all) do
    visit("/")
    set_cookie()
    visit("/create")
    first('input#event-start-date').set((Date.today+1).strftime("%Y-%m-%d"))
    first('input#event-start-time').set("12:12")
    first('input#event-name').set("Test")
    first("trix-editor").set("Test")
    click_button "Create Event"
    sleep 1
    @link = first("#event-detail-shareable-link").value
    remove_cookie()
  end
  it 'can view events' do
    visit(@link.sub! "https://junipercity.com", "")
    expect(page).to have_selector("#event-detail-not-logged-in-message")
    
  end
end

