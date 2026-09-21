package com.felipeoliveira17y.landmensure;

import android.app.AlertDialog;
import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.ViewGroup;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {
    @PluginMethod
    public void print(PluginCall call) {
        String html = call.getString("html");
        if (html == null || html.isEmpty()) {
            call.reject("Documento vazio.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            WebView preview = new WebView(getActivity());
            preview.getSettings().setJavaScriptEnabled(true);
            preview.getSettings().setDomStorageEnabled(true);
            preview.setWebViewClient(new WebViewClient());
            preview.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                (int) (420 * getActivity().getResources().getDisplayMetrics().density)
            ));

            AlertDialog dialog = new AlertDialog.Builder(getActivity())
                .setTitle("Prévia de impressão")
                .setView(preview)
                .setPositiveButton("Imprimir / salvar PDF", null)
                .setNegativeButton("Fechar", (d, which) -> {})
                .create();
            dialog.setOnDismissListener(d -> preview.destroy());
            dialog.setOnShowListener(d -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
                PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                if (manager == null) {
                    return;
                }
                PrintAttributes attributes = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build();
                manager.print("Landmensure", preview.createPrintDocumentAdapter("Landmensure"), attributes);
            }));
            dialog.show();
            preview.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
            call.resolve();
        });
    }
}
