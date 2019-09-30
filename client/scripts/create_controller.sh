

if [ "$#" -ne 1 ]; then
	echo "Please provide a file name"
else

	cat <<FILE > "js/controllers/$1.js"
import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {}
FILE

fi
