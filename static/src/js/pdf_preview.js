/** @odoo-module **/

import { registry } from "@web/core/registry";
import { browser } from "@web/core/browser/browser";
import { session } from "@web/session";
import { PreviewDialog } from "./dialog";
import { _t, core } from "@web/core/l10n/translation";
import { rpc } from "@web/core/network/rpc";

/**
 * Generates the report url given a report action.
 *
 * @private
 * @param {ReportAction} action
 * @returns {string}
 */
function _getReportUrl(action,name_list) {
    let url = `/report/pdf/${action.report_name}`;
    const actionContext = action.context || {};
    let filename = action.name;
    
    // 合并name_list，用/隔开
    const combined_names = name_list.length > 1 ? '多个' : name_list[0].name;
    
    // 获取当前日期并格式化为yyyymmdd
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // 组合新文件名
    if(filename !== undefined)
        filename = `${filename}-${combined_names}-${dateStr}`.replace(/[/?%#&=]/g, "") + ".pdf";
    
    if (action.data && JSON.stringify(action.data) !== "{}") {
        const options = encodeURIComponent(JSON.stringify(action.data));
        const context = encodeURIComponent(JSON.stringify(actionContext));
        url += `?options=${options}&context=${context}&`;
    } else {
        if (actionContext.active_ids) {
            url += `/${actionContext.active_ids.join(",")}?`;
        }
    }
    return url += `${filename}`;
}

async function PdfPrintPreview(action, options, env) {
    // 通过env获取被选中的数据
    const actionContext = action.context || {};
    
    // 获取当前活动模型和选中的记录ID
    const activeModel = actionContext.active_model;
    const activeIds = actionContext.active_ids || [];
    
    // 如果有选中的记录，可以通过RPC获取更多详细信息
    let name_list = [];
    if (activeModel && activeIds && activeIds.length > 0) {
        try {
            name_list = await rpc('/web/dataset/call_kw', {
                model: activeModel,
                method: 'read',
                args: [activeIds, ['name']],  // 只获取name字段
                kwargs: {
                    context: actionContext,
                }
            });
            console.log('选中的记录名称信息:', records);
        } catch (error) {
            console.error('获取选中记录名称失败:', error);
        }
    }
    
    const link = '<br><br><a href="http://wkhtmltopdf.org/" target="_blank">wkhtmltopdf.org</a>';
    const WKHTMLTOPDF_MESSAGES = {
        broken:
            _t(
                "Your installation of Wkhtmltopdf seems to be broken. The report will be shown " +
                    "in html."
            ) + link,
        install:
            _t(
                "Unable to find Wkhtmltopdf on this system. The report will be shown in " + "html."
            ) + link,
        upgrade:
            _t(
                "You should upgrade your version of Wkhtmltopdf to at least 0.12.0 in order to " +
                    "get a correct display of headers and footers as well as support for " +
                    "table-breaking between pages."
            ) + link,
        workers: _t(
            "You need to start Odoo with at least two workers to print a pdf version of " +
                "the reports."
        ),
    };

    if (action.report_type === "qweb-pdf" && env.services.menu.getCurrentApp() !== undefined) {
        let wkhtmltopdfStateProm = rpc("/report/check_wkhtmltopdf");
        const state = await wkhtmltopdfStateProm;

        // display a notification according to wkhtmltopdf's state
        if (state in WKHTMLTOPDF_MESSAGES) {
            env.services.notification.add(WKHTMLTOPDF_MESSAGES[state], {
                sticky: true,
                title: _t("Report"),
            });
        }

        if (state === "upgrade" || state === "ok" && (session.preview_print || session.automatic_printing)) {
            let url = _getReportUrl(action,name_list);
            if(session.preview_print){
                
                PreviewDialog.createPreviewDialog(env, url, action.name,name_list);
            }
            if (session.automatic_printing) {
                try {
                    var pdf = window.open(url);
                    pdf.print();
                }
                catch(err) {
                    env.services.notification.add(
                        _t("Please allow pop up in your browser to preview report in another tab."),
                        {
                            sticky: true,
                            title: _t("Report"),
                        });
                }
            }
            return true;
        }

    }
}

registry
    .category("ir.actions.report handlers")
    .add("pdf_print_preview", PdfPrintPreview);
