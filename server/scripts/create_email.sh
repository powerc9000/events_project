#!/bin/bash
if [ "$#" -ne 1 ]; then
	echo "Please provide a file name"
else
	name="${1%%.*}"
cat <<FILE > "src/email_templates/$name.njk.mjml"
<mjml>
<mj-head>
	<mj-attributes>
		<mj-all font-family="monospace" />
			<mj-section background-color="white" full-width="full-width"/>
	</mj-attributes>
</mj-head>
<mj-body background-color="#F0F0F0">
	<mj-section background-color="#F0F0F0">
		<mj-column>
			<mj-spacer height="20px"/>
		</mj-column>
	</mj-section>

	<mj-section full-width="full-width"  padding-top="50px">
		<mj-column>
			<mj-image src="https://junipercity.com/static/img/logo_small.png" alt="Juniper City" width="200px"></mj-image>
		</mj-column>

	</mj-section>
</mj-body>
</mjml>
FILE

echo "created templates/$name.njk.mjml"
fi
