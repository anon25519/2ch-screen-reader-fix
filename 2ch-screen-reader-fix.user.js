// ==UserScript==
// @name         2ch-screen-reader-fix
// @version      0.1
// @description  Скрипт для облегчения чтения 2ch через скринридер
// @author       https://github.com/anon25519
// @include      *://2ch.*
// @grant        none
// @run-at       document-end
// ==/UserScript==

let HIDDEN_POSTS_LIMIT = 1000;

let hiddenPosts = null;
let hiddenPostsList = null;
let hiddenPostsSet = null;

let LoadHiddenPosts = () => {
    let storageJson = localStorage.getItem('screenreaderLS') || "{}";
    hiddenPosts = JSON.parse(storageJson);
    if (!hiddenPosts.hasOwnProperty(window.board)) {
        hiddenPosts[window.board] = [];
    }
    hiddenPostsList = hiddenPosts[window.board];
    hiddenPostsSet = new Set(hiddenPostsList);
};
let SaveHiddenPosts = () => {
    localStorage.setItem('screenreaderLS', JSON.stringify(hiddenPosts));
};
LoadHiddenPosts();

function saveHiddenPost(id) {
    id = parseInt(id);

    LoadHiddenPosts();
    hiddenPostsList.push(id);
    hiddenPostsSet.add(id);
    if (hiddenPostsList.length > HIDDEN_POSTS_LIMIT) {
        let delId = hiddenPostsList.shift();
        hiddenPostsSet.delete(delId);
    }
    SaveHiddenPosts();
}

function delHiddenPost(id) {
    id = parseInt(id);

    LoadHiddenPosts();
    hiddenPostsSet.delete(id);
    let index = hiddenPostsList.indexOf(id);
    if (index !== -1) {
        hiddenPostsList.splice(index, 1);
    }
    SaveHiddenPosts();
}


function findInEl(el, c, n) {
    let l = el.getElementsByClassName(c);
    if (!l || l.length <= n) return {'textContent':''};
    return l[n]
}

function createElementFromHTML(htmlString) {
    let div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstElementChild;
}

function createSpan(s) {
    let span = document.createElement('span');
    span.textContent = s;
    return span;
}

function parseDate(d) {
    d = d.split(' ');
    let monthStr = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    let day = parseInt(d[0].split('/')[0]);
    let m = monthStr[parseInt(d[0].split('/')[1]) - 1];
    let y = `20${d[0].split('/')[2]}`;
    let t = d[2];
    let timeString = `${day} ${m} ${y} года, ${t}`;
    return timeString;
}

function processMessage(msg) {
    let quotes = msg.getElementsByClassName('unkfunc');
    for (let quote of quotes) {
        let newQuote = document.createElement('div');
        newQuote.style = 'display: inline;';
        newQuote.setAttribute('aria-label', 'цитата');
        quote.insertAdjacentElement('afterend', newQuote);
        newQuote.appendChild(quote);
    }
    let spoilers = msg.getElementsByClassName('spoiler');
    for (let spoiler of spoilers) {
        let newSpoiler = document.createElement('div');
        newSpoiler.style = 'display: inline;';
        newSpoiler.setAttribute('aria-label', 'спойлер');
        spoiler.insertAdjacentElement('afterend', newSpoiler);
        newSpoiler.appendChild(spoiler);
    }
}

function processPost(post, isOppost = false) {
    let postNum = findInEl(post, 'post__number', 0).textContent;
    let title = findInEl(post, 'post__title', 0).textContent;
    let name = findInEl(post, 'post__anon', 0).textContent;
    let mod = findInEl(post, 'post__mod', 0).textContent;
    let icon = '';
    let iconEl = post.getElementsByClassName('post__icon')[0];
    if (iconEl) {
        let iconImg = iconEl.getElementsByTagName('img')[0];
        if (iconImg) icon = iconImg.title;
    }
    let email = findInEl(post, 'post__email', 0).href;
    let trip = findInEl(post, 'post__trip', 0).textContent;
    let op = findInEl(post, 'post__ophui', 0).textContent;
    let dateEl = findInEl(post, 'post__time', 0);
    dateEl.textContent = `Дата - ${parseDate(dateEl.textContent)}. `;
    let refLinkEl = findInEl(post, 'post__reflink', 0);
    refLinkEl.textContent = `${refLinkEl.id}`;
    let refLink2El = findInEl(post, 'post__reflink', 1);
    refLink2El.textContent = 'Ответить';
    let messageEl = findInEl(post, 'post__message', 0);
    processMessage(messageEl);
    let refmapEl = findInEl(post, 'post__refmap', 0);
    refmapEl.insertAdjacentElement('afterbegin', createSpan(`Ответов ${refmapEl.children.length}: `));
    let files = post.getElementsByClassName('post__image');

    let newHeading = document.createElement(isOppost ? 'h3' : 'h4');
    newHeading.style = "border: 2px solid #008800";
    newHeading.id = refLinkEl.id;
    refLinkEl.removeAttribute('id');
    if (isOppost) {
        newHeading.appendChild(createSpan('ОП пост. '));
    }
    else {
        if (postNum) newHeading.appendChild(createSpan(`Пост - ${postNum}. `));
    }
    if (title) newHeading.appendChild(createSpan(`Тема - ${title}. `));
    if (name && name != 'Аноним') newHeading.appendChild(createSpan(`Имя - ${name}. `));
    if (mod) newHeading.appendChild(createSpan(`${mod}. `));
    if (icon) newHeading.appendChild(createSpan(`Иконка - ${icon}. `));
    if (email) {
        email.toLowerCase() == 'mailto:sage' ?
        newHeading.appendChild(createSpan('Sage. ')) :
        newHeading.appendChild(createElementFromHTML(`<a href="${email}" aria-label="Email">${email.substring('mailto:'.length)}. </a>`));
    }
    if (trip) newHeading.appendChild(createSpan(`Трипкод - ${trip}. `));
    if (op) newHeading.appendChild(createSpan('ОП треда. '));
    newHeading.appendChild(dateEl);
    if (files.length) newHeading.appendChild(createSpan(`Прикрепленных файлов: ${files.length}. `));
    newHeading.appendChild(refLinkEl);

    let newFiles = document.createElement('section');
    newFiles.setAttribute('role', 'list');
    newFiles.setAttribute('aria-label', 'Прикрепленные файлы');

    for (let file of files) {
        let fileAttrElement = file.getElementsByClassName('post__file-attr')[0];
        let fileAttrs = fileAttrElement.getElementsByClassName('post__filezise')[0].textContent.split(', ');
        let thumb = file.getElementsByClassName('post__image-link')[0];
        let img = thumb.getElementsByTagName('img')[0];
        let name = img.getAttribute('data-title');
        let width = img.getAttribute('data-width');
        let height = img.getAttribute('data-height');
        let fileSize = fileAttrs[0];
        img.setAttribute('alt', '');
        let fileDesc = ''
        if (fileAttrs.length >= 3) {
            fileDesc = `Имя видео - ${name}, разрешение ${width} на ${height}, размер - ${fileSize}, длительность - ${fileAttrs[2]}.`;
        }
        else {
            fileDesc = `Имя картинки - ${name}, разрешение ${width} на ${height}, размер - ${fileSize}.`;
        }
        thumb.classList.remove('post__image-link');

        let listitem = document.createElement('div');
        listitem.setAttribute('role', 'listitem');
        listitem.appendChild(createSpan(`${fileDesc}`));
        listitem.appendChild(thumb);
        newFiles.appendChild(listitem);
    }

    let hideButton = document.createElement('a');
    hideButton.id = `hideButton${newHeading.id}`;
    if (isOppost) {
        hideButton.textContent = 'Скрыть тред';
        hideButton.onclick = function () {
            let thread = document.getElementById(`newPostBody${newHeading.id}`).parentElement.parentElement;
            if (hideButton.textContent == 'Раскрыть тред') {
                delHiddenPost(newHeading.id);
                document.getElementById(`newPostBody${newHeading.id}`).style = 'display: block;';
                for (let i = 1; i < thread.children.length; i++) {
                    thread.children[i].style = 'display: block;';
                }
                hideButton.textContent = 'Скрыть тред';
            }
            else {
                saveHiddenPost(newHeading.id);
                document.getElementById(`newPostBody${newHeading.id}`).style = 'display: none;';
                for (let i = 1; i < thread.children.length; i++) {
                    thread.children[i].style = 'display: none;';
                }
                hideButton.textContent = 'Раскрыть тред';
            }
        };
    }
    else {
        hideButton.textContent = 'Скрыть пост';
        hideButton.onclick = function () {
            if (hideButton.textContent == 'Раскрыть пост') {
                delHiddenPost(newHeading.id);
                document.getElementById(`newPostBody${newHeading.id}`).style = 'display: block;';
                hideButton.textContent = 'Скрыть пост';
            }
            else {
                saveHiddenPost(newHeading.id);
                document.getElementById(`newPostBody${newHeading.id}`).style = 'display: none;';
                hideButton.textContent = 'Раскрыть пост';
            }
        };
    }

    let newPost = document.createElement('div');
    newPost.style = "border: 2px solid #880000";
    newPost.classList.add('post');
    newPost.setAttribute('data-num', `${newHeading.id}`);
    newPost.appendChild(newHeading);
    newPost.appendChild(hideButton);
    let newPostBody = document.createElement('div');
    newPostBody.id = `newPostBody${newHeading.id}`;
    newPostBody.appendChild(refLink2El);
    newPostBody.appendChild(document.createElement('br'));
    if (isOppost) newPostBody.appendChild(createElementFromHTML(`<a href="${refLink2El.href}">Перейти в тред. </a>`));
    if (files.length) newPostBody.appendChild(newFiles);
    newPostBody.appendChild(messageEl);
    newPostBody.appendChild(refmapEl);
    newPost.appendChild(newPostBody);

    post.insertAdjacentElement('afterend', newPost);
    return newHeading.id;
}

function isMakaba() {
    return document.getElementsByClassName('makaba').length
}

// Работаем только на главной и в тредах
if (!isMakaba()) return;

let isInThread = document.getElementsByClassName('thread').length == 1;

// Подписка на изменение DOM
// Select the node that will be observed for mutations
var targetNodeThread = document.getElementsByClassName('thread')[0];
var targetNodeBoard = document.getElementById('posts-form');

// Options for the observer (which mutations to observe)
var config = { childList: true };

let observerThread = null;
let observerBoard = null;
let totalTime = 0;

function processThread() {
    let t1 = performance.now();
    observerThread.disconnect();
    if (!isInThread) observerBoard.disconnect();
    let postsCollection = document.getElementsByClassName('thread__post');

    let posts = [];
    for (let post of postsCollection) {
        posts.push(post);
    }

    let postsId = [];
    for (let post of posts) {
        if (isInThread) postsId.push(parseInt(processPost(post)));
        post.remove();
    }

    let opPosts = document.getElementsByClassName('thread__oppost');
    for (let post of opPosts) {
        postsId.push(parseInt(processPost(post, true)));
    }
    while(opPosts.length > 0) {
        opPosts[0].parentNode.removeChild(opPosts[0]);
    }

    for (let id of postsId) {
        if (hiddenPostsSet.has(id)) {
            document.getElementById(`hideButton${id}`).click();
        }
    }

    // Обновить количество ответов
    let refmaps = document.getElementsByClassName('post__refmap');
    for (let refmap of refmaps) {
        let l = refmap.getElementsByTagName('a').length;
        if (refmap.children.length > 0) {
            if (refmap.children[0].tagName == 'SPAN') {
                refmap.children[0].textContent = `Ответов ${l}: `;
            }
            else {
                refmap.insertAdjacentElement('afterbegin', createSpan(`Ответов ${l}: `));
            }
        }
    }
    observerThread.observe(targetNodeThread, config);
    if (!isInThread) observerBoard.observe(targetNodeBoard, config);
    let t2 = performance.now();
    totalTime += t2 - t1;
    //console.log('=== time: ' + (t2 - t1) + ', total: ' + totalTime);
}

// Callback function to execute when mutations are observed
var callback = function(mutationsList) {
    for (var mutation of mutationsList) {
        if (mutation.type == 'childList') {
            processThread();
        }
    }
};

observerThread = new MutationObserver(callback);
if (!isInThread) observerBoard = new MutationObserver(callback);

observerThread.observe(targetNodeThread, config);
if (!isInThread) observerBoard.observe(targetNodeBoard, config);

setTimeout(processThread, 500);
