class Pagination {
    entriesPerPage;
    fullList = [];
    
    get maximumPageIndex() {
        return Math.ceil(this.fullList.length / this.entriesPerPage) - 1;
    }
    
    constructor(entriesPerPage, fullList) {
        this.entriesPerPage = entriesPerPage;
        this.fullList = fullList;
    }
    
    getDisplayEntries(page) {
        let lastIndex = this.fullList.length - 1;
        let startIndex = Math.min(page * this.entriesPerPage, lastIndex);
        let endIndex = Math.min(Math.max(0, startIndex + this.entriesPerPage - 1), lastIndex);
        
        return this.fullList.slice(startIndex, endIndex);
    }
}