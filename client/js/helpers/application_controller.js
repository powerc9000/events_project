import {Controller} from "stimulus";

const turbolinks = require("turbolinks");


function requestJson(verb, path, data){
  return fetch(path, {
    method: verb,
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include"
  });
}

function request(verb, path){
  return fetch(path, {
    method: verb
  });
}

function Patch(path, data){
  return requestJson("PATCH", path, data);
}

function Get(path){
  return request("GET", path);
}

function Delete(path){
  return request("DELETE", path);
}

function Post(path, data){
  return requestJson("POST", path, data);
}

function reload(){
  replace(window.location);
}
function replace(path){
  turbolinks.visit(path, {action: "replace"})
}

function visit(path){
  turbolinks.visit(path);
}
function clearCache(){
  turbolinks.clearCache();
}

class ApplicationController extends Controller {
  disableButton(targetName){
    const target = this.targets.find(targetName);

    if(target){
      target.setAttribute("disabled", "");
      target.classList.add("disabled");
    }

  }
  hideTarget(targetName){
    const target = this.targets.find(targetName);

    if(target){
      target.classList.add("hidden");
    }
  }
  showTarget(targetName){
    const target = this.targets.find(targetName);

    if(target){
      target.classList.remove("hidden")
    }
  }
  removeTargetAttribute(targetName, attributeName){
    const target = this.targets.find(targetName);
    if(target){
      target.removeAttribute(attributeName);
    }
  }
  setTargetAttribute(targetName, attributeName, value){
    const target = this.targets.find(targetName);
    if(target){
      target.setAttribute(attributeName, value);
    }
  }
  toggleTarget(targetName){
    const target = this.targets.find(targetName);

    if(target){
      target.classList.toggle("hidden");
    }
  }
  page = {
    reload,
    replace,
    visit,
    clearCache
  }
  api = {
    Patch,
    Get,
    Post,
    Delete
  }
  enableButton(targetName){
    const target = this.targets.find(targetName);
    if(target){
      target.removeAttribute("disabled");
      target.classList.remove("disabled");
    }
  }
  debounce(func, wait){
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(()=>{
        func(...args);
      }, wait)
    }
  }
}

export {
  ApplicationController
}