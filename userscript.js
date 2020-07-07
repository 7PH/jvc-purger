// ==UserScript==
// @name         JVC Purger
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Delete your posts from JVC
// @author       You
// @match        http*://www.jeuxvideo.com/profil/*?mode=historique_forum*
// @grant        GM_xmlhttpRequest
// ==/UserScript==



class JVCare {

    static replaceAll(body) {
        return body.replace(
            /JvCare ([A-Z0-9]+)/g,
            (match, contents, offset, input_string) => {
                return JVCare.decode(contents);
            });
    }

    static decode(source) {
        if (source.substr(0, 7).toLowerCase() === "jvcare ") {
            source = source.substr(7);
        }

        let result = "";
        for (let i = 0; i < source.length; i += 2) {
            result += String.fromCharCode(
                JVCare.KEY.indexOf(source.charAt(i)) * 16
                + JVCare.KEY.indexOf(source.charAt(i + 1))
            );
        }

        return result;
    }
}

JVCare.KEY = "0A12B34C56D78E9F";


(function() {
    'use strict';

    const ACTIVATION_CODE = "makeyourdreamcometruejustdoit";

    let htmlBuilt = false;

    function getMessagesIds() {
        return Array.from(document.getElementsByClassName('bloc-message-forum'))
        //.filter(m => ! m.classList.contains('msg-supprime'))
            .map(m => parseInt(m.dataset.id));
    }

    function getToken() {
        return document.getElementById('ajax_hash_moderation_forum').value;
    }

    async function deleteMessages(token, ids) {
        const postData = `type=delete&ajax_hash=${token}&${ids.map(id => 'tab_message[]=' + id).join('&')}`;
        let errors = await (await fetch("http://www.jeuxvideo.com/forums/modal_del_message.php", {
            method: "POST",
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: postData
        })).json();
        if (errors.length > 0) {
            throw new Error(errors[0]);
        }
    }

    async function deleteCurrentPage() {
        await deleteMessages(getToken(), getMessagesIds());
    }

    async function gotoNext() {
        const pagi = document.getElementsByClassName('pagi-after')[0];
        if (typeof pagi === "undefined") {
            return false;
        }
        const url = pagi.children[0].children[0].href || pagi.children[0].children[0].classList[0];
        if (typeof url === "undefined") {
            return false;
        }
        console.log("url", url);
        let newHtml = await (await fetch(url)).text();
        document.getElementsByTagName('html')[0].innerHTML = JVCare.replaceAll(newHtml);
        return true;
    }

    async function init() {

        // init purge button
        if (document.location.hash !== ACTIVATION_CODE && ! htmlBuilt) {
            htmlBuilt = true;
            const bloc = document.getElementsByClassName('bloc-on-right')[0];
            const a = document.createElement('a');
            a.href = '#' + ACTIVATION_CODE;
            a.innerHTML = "PURGE";
            a.addEventListener('click', () => setTimeout(init, 500));
            const span = document.createElement("span");
            span.classList.add('etat-histo-msg');
            span.appendChild(a);
            bloc.appendChild(span);
            return;
        }

        // delete all
        let hasNext = true;
        while (hasNext) {
            await deleteCurrentPage();
            hasNext = await gotoNext();
        }

        // end
        document.location.href = "http://www.jeuxvideo.com";
    }

    window.addEventListener('load', function() {
        setTimeout(init, 1000);
    });
})();
