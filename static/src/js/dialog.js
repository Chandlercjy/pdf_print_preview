/** @odoo-module **/
import { renderToElement } from "@web/core/utils/render";
import { _t } from "@web/core/l10n/translation";
class PdfPreview {
    async preview(url) {
        try {
            // Construct the PDF.js viewer URL
            const urlTemplate = `/pdf_print_preview/static/lib/PDFjs/web/viewer.html?file=${encodeURIComponent(url)}`;

            // Create the iframe for PDF rendering
            const iframe = document.createElement("iframe");
            iframe.src = urlTemplate;
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.border = "none";

            // Return the iframe as preview content
            return iframe;
        } catch (error) {
            console.error("Error rendering PDF preview:", error);
            throw error;
        }
    }
}

class PreviewDialog {
    constructor(parent, pdfPreview, url, title,name_list) {
        this.parent = parent;
        this.title = title || "Preview";
        this.url = url;
        this.name_list = name_list;

        // Render the modal element
        this.modalElement = this._renderModal();

        // Initialize custom events
        this._initEvents();
        this.pdfPreview = pdfPreview;
    }

    _renderModal() {
        // Use your rendering utility or manual creation of the modal
        const modalTemplate = `
            <div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true" style="display: none;">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <header class="modal-header">
                            <h4 class="col-11 text-center modal-title">${this.title}</h4>
                            <button type="button" class="btn preview-maximize" title="Maximize">
                                <i class="fa fa-expand"></i>
                            </button>
                            <button type="button" class="btn preview-minimize" title="Minimize" style="display: none;">
                                <i class="fa fa-compress"></i>
                            </button>
                            <button type="button" class="btn-close" aria-label="Close">
                            </button>
                        </header>
                        <main class="modal-body" style="height: 75vh; overflow-y: auto;"></main>
                        <footer class="modal-footer">
                            <button type="button" class="btn btn-primary mr-auto" aria-label="Close">Close</button>
                        </footer>
                    </div>
                </div>
            </div>`;
        const wrapper = document.createElement("div");
        wrapper.innerHTML = modalTemplate.trim();
        return wrapper.firstChild;
    }

    _initEvents() {
        const maximizeButton = this.modalElement.querySelector(".preview-maximize");
        const minimizeButton = this.modalElement.querySelector(".preview-minimize");
        const closeButton = this.modalElement.querySelector(".btn-close");
        const footerCloseButton = this.modalElement.querySelector(".modal-footer .btn");

        if (maximizeButton) {
            maximizeButton.addEventListener("click", this.maximize.bind(this));
        }

        if (minimizeButton) {
            minimizeButton.addEventListener("click", this.minimize.bind(this));
        }

        if (closeButton || footerCloseButton) {
            (closeButton || footerCloseButton).addEventListener("click", this.close.bind(this));
        }
    }

    async renderElement() {
        try {
            const content = await this.pdfPreview.preview(this.url);
            const modalBody = this.modalElement.querySelector(".modal-body");
            if (modalBody) {
                modalBody.innerHTML = ""; // Clear any existing content
                modalBody.appendChild(content);
            }
        } catch (error) {
            console.error("Error rendering PDF content:", error);
            const modalBody = this.modalElement.querySelector(".modal-body");
            if (modalBody) {
                modalBody.innerHTML = `<p class="text-danger">Failed to load PDF content. Please try again.</p>`;
            }
        }
    }

    async open() {
        await this.renderElement();

        // Append modal to the document body
        document.body.appendChild(this.modalElement);

        // Show the modal
        this.modalElement.classList.add("show");
        this.modalElement.style.display = "block";

        // Add backdrop
        this._addBackdrop();
    }

    _addBackdrop() {
        const backdrop = document.createElement("div");
        backdrop.classList.add("modal-backdrop", "fade", "show");
        document.body.appendChild(backdrop);

        // Close modal on backdrop click (optional)
        backdrop.addEventListener("click", () => this.close());
        this.backdropElement = backdrop;
    }

    maximize() {
        const modalDialog = this.modalElement.querySelector(".modal-dialog");
        if (modalDialog) {
            modalDialog.classList.add("modal-full");
            const maximizeButton = this.modalElement.querySelector(".preview-maximize");
            const minimizeButton = this.modalElement.querySelector(".preview-minimize");

            maximizeButton.style.display = "none";
            minimizeButton.style.display = "inline-block";
        }
    }

    minimize() {
        const modalDialog = this.modalElement.querySelector(".modal-dialog");
        if (modalDialog) {
            modalDialog.classList.remove("modal-full");
            const maximizeButton = this.modalElement.querySelector(".preview-maximize");
            const minimizeButton = this.modalElement.querySelector(".preview-minimize");

            maximizeButton.style.display = "inline-block";
            minimizeButton.style.display = "none";
        }
    }

    close() {
        // Hide modal
        this.modalElement.style.display = "none";
        this.modalElement.classList.remove("show");

        // Remove backdrop
        if (this.backdropElement) {
            this.backdropElement.remove();
        }

        // Remove modal from the DOM
        this.destroy();
    }

    destroy() {
        this.modalElement.remove();
    }
}

// Export PdfPreview and PreviewDialog classes
export { PdfPreview, PreviewDialog };

// Create a static method to initialize and open the dialog
PreviewDialog.createPreviewDialog = async function (parent, url, title,name_list) {
    const pdfPreview = new PdfPreview();
    const dialog = new PreviewDialog(parent, pdfPreview, url, title,name_list);
    await dialog.open();
    return dialog;
};
