import json
import logging
import werkzeug.exceptions
from odoo import http
from odoo.http import content_disposition, request


_logger = logging.getLogger(__name__)


class ReportController(http.Controller):

    #------------------------------------------------------
    # Report controllers
    #------------------------------------------------------
    @http.route([
        '/report/<converter>/<reportname>',
        '/report/<converter>/<reportname>/<docids>',
    ], type='http', auth='user', website=True)
    def report_routes(self, reportname, docids=None, converter=None, **data):
        report = request.env['ir.actions.report']
        context = dict(request.env.context)
        context.update({'allowed_company_ids': request.env.user.company_ids.ids})

        if docids:
            docids = [int(i) for i in docids.split(',') if i.isdigit()]
        if data.get('options'):
            data.update(json.loads(data.pop('options')))
        if data.get('context'):
            data['context'] = json.loads(data['context'])
            context.update(data['context'])
        if converter == 'html':
            html = report.with_context(context)._render_qweb_html(reportname, docids, data=data)[0]
            return request.make_response(html)
        elif converter == 'pdf':
            pdf = report.with_context(context)._render_qweb_pdf(reportname, docids, data=data)[0]
            pdfhttpheaders = [('Content-Type', 'application/pdf'), ('Content-Length', len(pdf))]
            return request.make_response(pdf, headers=pdfhttpheaders)
        elif converter == 'text':
            text = report.with_context(context)._render_qweb_text(reportname, docids, data=data)[0]
            texthttpheaders = [('Content-Type', 'text/plain'), ('Content-Length', len(text))]
            return request.make_response(text, headers=texthttpheaders)
        else:
            raise werkzeug.exceptions.HTTPException(description='Converter %s not implemented.' % converter)
