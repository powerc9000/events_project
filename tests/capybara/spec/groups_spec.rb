describe 'View group' do
  before(:all) do
    visit("/")
    set_cookie()
    visit("/groups/create")
    first('input#group-name').set("Test")
    first('input#custom-path').set("wubba-subba")
    first("trix-editor").set("Test")
    click_button "Create Group"
    sleep 1
    remove_cookie()
  end

  it 'can see a group' do
    visit("/")
    set_cookie()
    visit("/groups/wubba-subba")

    expect(page).to have_selector("#group-name-span")
    expect(page).to have_css("#group-name-span", text: "Test")
  end
end
