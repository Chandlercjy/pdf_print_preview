# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from markupsafe import Markup

from odoo import api, fields, models, tools, SUPERUSER_ID, _
from odoo.exceptions import UserError, AccessError
import logging
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True

try:
    from PyPDF2.errors import PdfReadError
except ImportError:
    from PyPDF2.utils import PdfReadError

_logger = logging.getLogger(__name__)


class IrActionsReport(models.Model):
    _inherit = 'ir.actions.report'

    def _render_qweb_pdf(self, report_ref, res_ids=None, data=None):
        if not data:
            data = {}
        if isinstance(res_ids, int):
            res_ids = [res_ids]
        data.setdefault('report_type', 'pdf')
        # In case of test environment without enough workers to perform calls to wkhtmltopdf,
        # fallback to render_html.
        if (tools.config['test_enable'] or tools.config['test_file']) and not self.env.context.get(
                'force_report_rendering'):
            return self._render_qweb_html(report_ref, res_ids, data=data)

        collected_streams = self._render_qweb_pdf_prepare_streams(report_ref, data, res_ids=res_ids)

        # access the report details with sudo() but keep evaluation context as current user
        report_sudo = self._get_report(report_ref)

        # Generate the ir.attachment if needed.
        if report_sudo.attachment:
            attachment_vals_list = self._prepare_pdf_report_attachment_vals_list(report_sudo, collected_streams)
            if attachment_vals_list:
                attachment_names = ', '.join(x['name'] for x in attachment_vals_list)
                try:
                    self.env['ir.attachment'].create(attachment_vals_list)
                except AccessError:
                    _logger.info("Cannot save PDF report %r attachments for user %r", attachment_names,
                                 self.env.user.display_name)
                else:
                    _logger.info("The PDF documents %r are now saved in the database", attachment_names)

        # Merge all streams together for a single record.
        streams_to_merge = [x['stream'] for x in collected_streams.values() if x['stream']]
        if len(streams_to_merge) == 1:
            pdf_content = streams_to_merge[0].getvalue()
        else:
            with self._merge_pdfs(streams_to_merge) as pdf_merged_stream:
                pdf_content = pdf_merged_stream.getvalue()

        for stream in streams_to_merge:
            stream.close()

        if res_ids:
            _logger.info("The PDF report has been generated for model: %s, records %s.", report_sudo.model,
                         str(res_ids))

        ### this code is added by sltech to bypass the print of journal entries =============================

        if self._is_invoice_report(report_ref):
            invoices = self.env['account.move'].browse(res_ids)
            if self.env['ir.config_parameter'].sudo().get_param('account.display_name_in_footer'):
                data = data and dict(data) or {}
                data.update({'display_name_in_footer': True})
            # if any(x.move_type == 'entry' for x in invoices):
            #     raise UserError(_("Only invoices could be printed."))

        ### =================================== end ==============================================
        return pdf_content, 'pdf'