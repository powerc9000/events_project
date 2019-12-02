do_host="https://static.junipercity.com"
prod_env_file=static.prod.env
css_dir=build/css
js_dir=build/js
css_path=$css_dir/main.css
js_path=$js_dir/index.js

js=`md5 -q $js_path`
css=`md5 -q $css_path`

md5_css=$(basename $css_path .css).$css.css
md5_js=$(basename $js_path .js).$js.js

cp $css_path $css_dir/$md5_css
cp $js_path $js_dir/$md5_js

rm -f $prod_env_file

echo "CSS_BUNDLE_PATH=/static/css/$md5_css" >> $prod_env_file
echo "JS_BUNDLE_PATH=/static/js/$md5_js" >> $prod_env_file
echo "IMG_BUNDLE_PATH=/static/img" >> $prod_env_file

#echo "CSS_BUNDLE_PATH=$do_host/css/$md5_css" >> $prod_env_file
#echo "JS_BUNDLE_PATH=$do_host/js/$md5_js" >> $prod_env_file
#echo "IMG_BUNDLE_PATH=$do_host/img" >> $prod_env_file

