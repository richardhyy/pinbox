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

    _getPageEntries(page) {
        return this.#records.slice((page - 1) * this.limit, page * this.limit);
    }

    loadPage(page) {
        this.#currentPage = page;
        this.#beforeLoadPage();

        this.#showPage(this._getPageEntries(page));
        this.#updatePageIndex();
    }

    getPageNumberForRecord(condition) {
        for (let i = 0; i < this.totalPages; i++) {
            const page = this._getPageEntries(i + 1);
            if (page.find(record => condition(record)) !== undefined) {
                return i + 1;
            }
        }
        return 1;
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