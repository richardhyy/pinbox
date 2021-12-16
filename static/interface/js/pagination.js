/**
 * Paginating for local data
 */
class Pagination {
    limit;
    #beforeLoadPage;
    #showPage;
    #updatePageIndex;
    #currentPage = null;

    #records = [];

    constructor(records, limit, showPage, updatePageIndex, beforeLoadPage) {
        this.#records = records;
        this.limit = limit;
        this.#beforeLoadPage = beforeLoadPage;
        this.#showPage = showPage;
        this.#updatePageIndex = updatePageIndex;
    }

    get totalRecords() {
        return this.#records.length;
    }

    get totalPages() {
        return this.totalRecords <= 1 ? 1 : Math.ceil(this.totalRecords / this.limit);
    }

    reloadPage() {
        if (this.#currentPage === null) {
            this.loadPage(1);
        } else {
            this.loadPage(this.#currentPage);
        }
    }

    loadPage(page) {
        this.#currentPage = page;
        this.#beforeLoadPage();

        this.#showPage(this.#records.slice((page - 1) * this.limit, page * this.limit));
        this.#updatePageIndex();
    }

    appendData(record) {
        this.#records.push(record);
        this.reloadPage();
    }

    insertData(record, index) {
        this.#records.splice(index, 0, record);
        this.reloadPage();
    }

    setData(records) {
        this.#records = records;
        this.reloadPage();
    }

    getData() {
        return this.#records;
    }
}