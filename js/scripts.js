const axios = require('axios');
const vue = require('vue');
const bootstrap = require('bootstrap');
let amdRequire;

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
    amdRequire = amdLoader.require;
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

    // amdRequire(['vs/editor/editor.main'], function () {
    //     editor = monaco.editor.create(document.getElementById('container'), {
    //         language: 'json',
    //         automaticLayout: true,
    //         theme: "vs-dark"
    //     });
    // });
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


let tabs = localStorage.getItem('tabs') != null ? JSON.parse(localStorage.getItem('tabs')) : [];

let editors = [];

const vueApp = vue.createApp({
    data () {
        return {
            tabs: tabs
        }
    },
    watch: {
        tabs: {
            deep: true,
            handler (tabs) {
                localStorage.setItem('tabs', JSON.stringify(tabs));

            }
        }
    },
    methods: {
        activeTab (tab) {
            this.tabs.forEach(function (item) { item.active = false; });
            tab.active = true;
        },
        addHeader (request, key = "", value = "") {
            request.headers.push({
                checked: true,
                key: key,
                value: value
            });
        },
        addTab () {

            this.tabs.forEach(function (item) {
                item.active = false;
            });

            this.tabs.push({
                active: true,
                id: (Math.random() + 1).toString(36).substring(2),
                request: {
                    url: "",
                    method: "GET",
                    body: "",
                    bodyType: "None",
                    headers: [],
                },
                response: {
                    statusCode: "",
                    elapsedTime: "",
                    size: ""
                }
            });
        },
        closeTab (itemIndex) {
            this.tabs.splice(itemIndex, 1);
            this.tabs.forEach(function (item) { item.active = false; });
            this.tabs[this.tabs.length - 1].active = true;
        },
        changeRequestMetod (method, request) {
            request.method = method;
        },
        getRequestTitle (tab) {
            return tab.request.url == "" ? "Untitled Request" : (tab.request.url.substr(0, 20) + "...");
        },
        send (tab) {

            let editorHolder = editors.find((item) => { return item.id == tab.id });

            if (editorHolder == undefined) {
                amdRequire(['vs/editor/editor.main'], function () {
                    let editor = monaco.editor.create(document.getElementById('editor' + tab.id), {
                        language: 'json',
                        automaticLayout: true,
                        theme: "vs-dark"
                    });

                    editors.push(
                        {
                            id: tab.id,
                            editor: editor
                        }
                    );

                    sendRequest(tab, editor);
                });

                return;
            }

            sendRequest(tab, editorHolder.editor);
        }
    }
}).mount("#app");

function setEditor (tab, response, editor) {

    let lang = getMonacoLang(response.headers["content-type"]);
    let editorModel = editor.getModel();
    monaco.editor.setModelLanguage(editorModel, lang)
    editorModel.setValue(response.data);

    tab.response.statusCode = response.status;
    tab.response.elapsedTime = `${new Date().getTime() - response.config.meta.requestStartedAt} ms`;
    tab.response.size = humanFileSize(JSON.stringify(response.data).length);

    setTimeout(function () {
        editor.getAction('editor.action.formatDocument').run();
    }, 100);

}

function sendRequest (tab, editor) {

    let request = tab.request;

    var activeHeaders = request.headers.filter((item) => { return item.checked === true });

    var config = {
        method: request.method,
        url: request.url,
        transformResponse: (res) => {
            // Do your own parsing here if needed ie JSON.parse(res);
            return res;
        },
    };

    if (activeHeaders.length > 0) {
        config.headers = activeHeaders.reduce(function (map, obj) {
            map[obj.key] = obj.value;
            return map;
        }, {});;
    }

    if (request.bodyType != "None") {
        if (request.body.length > 0) {
            config.data = JSON.stringify(JSON.parse(request.body));
        }
    }

    axios(config).then(response => {
        setEditor(tab, response, editor);
    }).catch(error => {

        if (error.response) {
            setEditor(tab, error.response, editor);
            return;
        }

        let editorModel = editor.getModel();
        monaco.editor.setModelLanguage(editorModel, "plaintext")
        editorModel.setValue("Could not send request");

        tab.response.statusCode = error;
        tab.response.elapsedTime = 0;
        tab.response.size = 0;

    });
}

