"use strict";

(() => {
  const API_URL = "https://jsonplaceholder.typicode.com/posts";
  const PAGE_SIZE = 10;
  const TOTAL_POSTS = 100;
  const SCROLL_THRESHOLD_PX = 200;
  const SEARCH_DEBOUNCE_MS = 300;

  const debounce = (callback, delay) => {
    let timerId = null;
    return (...args) => {
      clearTimeout(timerId);
      timerId = setTimeout(() => callback(...args), delay);
    };
  };

  class PostsApi {
    constructor(url) {
      this.url = url;
    }

    /**
     @param {number} start — сколько постов пропустить (смещение)
     @param {number} limit — сколько постов вернуть
     @returns {Promise<Array<{id:number,userId:number,title:string,body:string}>>}
     @throws {Error} с понятным пользователю сообщением
     **/
    async fetchPosts(start, limit) {
      try {
        const response = await fetch(
          `${this.url}?_start=${start}&_limit=${limit}`,
        );

        if (!response.ok) {
          throw new HttpError(response.status);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Сервер вернул данные в неожиданном формате.");
        }
        return data;
      } catch (error) {
        if (error instanceof HttpError) {
          throw new Error(
            `Сервер ответил с ошибкой (код ${error.status}). Попробуйте ещё раз.`,
          );
        }
        if (error instanceof SyntaxError) {
          throw new Error("Не удалось прочитать ответ сервера.");
        }
        if (error instanceof TypeError) {
          throw new Error(
            "Не удалось связаться с сервером. Проверьте подключение к интернету.",
          );
        }
        throw error;
      }
    }
  }

  class HttpError extends Error {
    constructor(status) {
      super(`HTTP ${status}`);
      this.status = status;
    }
  }

  class PostsModel {
    #posts = [];
    #query = "";
    #isLoading = false;
    #hasMore = true;
    #error = null;

    get loadedCount() {
      return this.#posts.length;
    }

    get query() {
      return this.#query;
    }

    get hasError() {
      return this.#error !== null;
    }

    get isLoading() {
      return this.#isLoading;
    }

    canLoad() {
      return !this.#isLoading && this.#hasMore && this.#error === null;
    }

    getFilteredPosts() {
      if (this.#query === "") {
        return [...this.#posts];
      }
      return this.#posts.filter((post) =>
        post.title.toLowerCase().includes(this.#query),
      );
    }

    getStatus() {
      return {
        isLoading: this.#isLoading,
        hasMore: this.#hasMore,
        error: this.#error,
        query: this.#query,
        loadedCount: this.#posts.length,
        shownCount: this.getFilteredPosts().length,
      };
    }

    setQuery(rawQuery) {
      this.#query = rawQuery.trim().toLowerCase();
    }

    startLoading() {
      this.#isLoading = true;
    }

    finishLoading(batch, requestedLimit) {
      const knownIds = new Set(this.#posts.map((post) => post.id));
      const fresh = batch.filter((post) => !knownIds.has(post.id));
      this.#posts = [...this.#posts, ...fresh];

      const gotFullPage = batch.length === requestedLimit;
      this.#hasMore = gotFullPage && this.#posts.length < TOTAL_POSTS;
      this.#isLoading = false;
    }

    failLoading(message) {
      this.#error = message;
      this.#isLoading = false;
    }

    clearError() {
      this.#error = null;
    }
  }

  class PostsView {
    constructor(root) {
      this.searchInput = root.querySelector("#search");
      this.counter = root.querySelector("#counter");
      this.list = root.querySelector("#posts");
      this.emptyNotice = root.querySelector("#empty");
      this.loader = root.querySelector("#loader");
      this.errorBox = root.querySelector("#error");
      this.errorText = root.querySelector("#error-text");
      this.retryButton = root.querySelector("#retry");
      this.loadMoreButton = root.querySelector("#load-more");
      this.endNotice = root.querySelector("#end");
    }

    bindSearch(handler) {
      this.searchInput.addEventListener("input", () =>
        handler(this.searchInput.value),
      );
    }

    bindScroll(handler) {
      window.addEventListener("scroll", handler, { passive: true });
    }

    bindRetry(handler) {
      this.retryButton.addEventListener("click", handler);
    }

    bindLoadMore(handler) {
      this.loadMoreButton.addEventListener("click", handler);
    }

    isNearBottom() {
      const scrolled = window.innerHeight + window.scrollY;
      const fullHeight = document.documentElement.scrollHeight;
      return scrolled >= fullHeight - SCROLL_THRESHOLD_PX;
    }

    renderPosts(posts) {
      const fragment = document.createDocumentFragment();
      posts.forEach((post) => fragment.appendChild(this.createPostCard(post)));
      this.list.textContent = "";
      this.list.appendChild(fragment);
    }

    createPostCard(post) {
      const item = document.createElement("li");
      const card = document.createElement("article");
      card.className = "post";

      const title = document.createElement("h2");
      title.className = "post__title";
      title.textContent = post.title;

      const body = document.createElement("p");
      body.className = "post__body";
      body.textContent = post.body;

      const meta = document.createElement("footer");
      meta.className = "post__meta";

      const postId = document.createElement("span");
      postId.textContent = `Пост #${post.id}`;
      const author = document.createElement("span");
      author.textContent = `Автор (userId): ${post.userId}`;
      meta.append(postId, author);

      card.append(title, body, meta);
      item.appendChild(card);
      return item;
    }

    renderStatus(state) {
      const { isLoading, hasMore, error, query, loadedCount, shownCount } =
        state;

      this.loader.hidden = !isLoading;

      this.errorBox.hidden = error === null;
      this.errorText.textContent = error === null ? "" : error;

      this.endNotice.hidden = hasMore || loadedCount === 0 || error !== null;

      this.emptyNotice.hidden = !(
        query !== "" &&
        shownCount === 0 &&
        loadedCount > 0
      );

      this.loadMoreButton.hidden = !(
        query !== "" &&
        hasMore &&
        !isLoading &&
        error === null
      );

      this.counter.textContent =
        query === ""
          ? `Загружено постов: ${loadedCount}`
          : `Найдено: ${shownCount} из ${loadedCount} загруженных`;
    }
  }

  class PostsController {
    constructor(api, model, view) {
      this.api = api;
      this.model = model;
      this.view = view;
      this.applySearch = debounce((value) => {
        this.model.setQuery(value);
        this.render();
      }, SEARCH_DEBOUNCE_MS);
    }

    init() {
      this.view.bindSearch((value) => this.applySearch(value));
      this.view.bindScroll(() => this.handleScroll());
      this.view.bindRetry(() => this.retry());
      this.view.bindLoadMore(() => this.loadNextPage());

      this.render();
      this.loadNextPage();
    }

    handleScroll() {
      if (this.view.isNearBottom()) {
        this.loadNextPage();
      }
    }

    retry() {
      if (this.model.isLoading) {
        return;
      }
      this.model.clearError();
      this.loadNextPage();
    }

    async loadNextPage() {
      if (!this.model.canLoad()) {
        return;
      }

      this.model.startLoading();
      this.renderStatus();

      try {
        const batch = await this.api.fetchPosts(
          this.model.loadedCount,
          PAGE_SIZE,
        );
        this.model.finishLoading(batch, PAGE_SIZE);
      } catch (error) {
        this.model.failLoading(error.message);
      }

      this.render();

      if (
        !this.model.hasError &&
        this.model.query === "" &&
        this.view.isNearBottom()
      ) {
        this.loadNextPage();
      }
    }

    render() {
      this.view.renderPosts(this.model.getFilteredPosts());
      this.renderStatus();
    }

    renderStatus() {
      this.view.renderStatus(this.model.getStatus());
    }
  }

  const controller = new PostsController(
    new PostsApi(API_URL),
    new PostsModel(),
    new PostsView(document),
  );
  controller.init();
})();
