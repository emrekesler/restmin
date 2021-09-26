let editor;
const axios = require('axios');
const vue = require('vue');
const bootstrap = require('bootstrap');

const { app } = require('electron');

axios.interceptors.request.use(request => {
    request.meta = request.meta || {}
    request.meta.requestStartedAt = new Date().getTime();
    return request;
})

window.addEventListener('DOMContentLoaded', event => {
    const sidebarToggle = document.body.querySelector('#sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }

});

function humanFileSize (size) {
    var i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};


(function () {
    const path = require('path');
    const amdLoader = require('./node_modules/monaco-editor/min/vs/loader.js');
    const amdRequire = amdLoader.require;
    const amdDefine = amdLoader.require.define;

    function uriFromPath (_path) {
        var pathName = path.resolve(_path).replace(/\\/g, '/');
        if (pathName.length > 0 && pathName.charAt(0) !== '/') {
            pathName = '/' + pathName;
        }
        return encodeURI('file://' + pathName);
    }

    amdRequire.config({
        baseUrl: uriFromPath(path.join(__dirname, './node_modules/monaco-editor/min'))
    });

    // workaround monaco-css not understanding the environment
    self.module = undefined;

    amdRequire(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(document.getElementById('container'), {
            language: 'json',
            automaticLayout: true,
            theme: "vs-dark"
        });
    });
})();


function getMonacoLang (contentType) {

    if (contentType == undefined) {
        return "plaintext";
    }

    switch (true) {
        case contentType.includes("application/json"):
            return "json";
            break;
        case contentType.includes("text/html"):
            return "html";
            break;
        case contentType.includes("text/plain"):
            return "plaintext";
        default:
            return "json";
    }
}
