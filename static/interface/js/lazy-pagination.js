class LazyPagination {
    totalRecords = -1;
    limit;
    urlConstructor;
    #beforeLoadPage;
    #showPage;
    #updatePageIndex;
    #onError;
    
    page_cache = {};
    
    constructor(limit, urlConstructor, showPage, updatePageIndex, beforeLoadPage, onError) {
        this.limit = limit;
        this.urlConstructor = urlConstructor;
        this.#beforeLoadPage = beforeLoadPage;
        this.#showPage = showPage;
        this.#updatePageIndex = updatePageIndex;
        this.#onError = onError;
    }

    get totalPages() {
        return this.totalRecords <= 1 ? 1 : Math.ceil(this.totalRecords / this.limit);
    }
    
    loadPage(page) {
        this.#beforeLoadPage();

        if (this.page_cache[page] !== undefined) {
            this.#showPage(this.page_cache[page]);
            this.#updatePageIndex();
        } else {
            $.ajax({
                type: "get",
                url: this.urlConstructor(this.limit, page),
                success: function (data) {
                    this.totalRecords = data.total_poi;
                    this.page_cache[page] = data.pois;
                    this.#showPage(this.page_cache[page]);
                    this.#updatePageIndex();
                }.bind(this),
                error: function (error) {
                    this.#onError(error);
                }.bind(this)
            })
        }
    }
}