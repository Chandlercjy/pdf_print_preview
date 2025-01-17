/** @odoo-module **/

import { registry } from "@web/core/registry";
import { _t,core } from "@web/core/l10n/translation";
import { rpc } from "@web/core/network/rpc";
import { user } from "@web/core/user";


function ReportPreviewItem(env) {
    return {
        type: "item",
        id: "report_preview",
        description: _t("Report preview"),
        callback: async function () {
        debugger
            const actionDescription = await rpc("/web/action/load", {
                action_id: "pdf_print_preview.action_short_preview_print"
            });
            actionDescription.res_id = user.userId;
            env.services.action.doAction(actionDescription);
        },
        sequence: 50,
    };
}

registry.category("user_menuitems").add("report_preview", ReportPreviewItem);
