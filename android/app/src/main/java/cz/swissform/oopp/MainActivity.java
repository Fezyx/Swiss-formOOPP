package cz.swissform.oopp;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Tenký obal aplikace „Evidence OOPP“ pro Android.
 *
 * Načítá webovou verzi z GitHub Pages, takže se aplikace aktualizuje stejně
 * jako v prohlížeči (service worker drží i offline režim). Nativní část řeší
 * jen to, co Android WebView sám neumí:
 *   - tisk (window.print) přes tiskárnu Androidu / „Uložit jako PDF“,
 *   - uložení exportů (PDF, CSV, záloha JSON) do složky Stahování,
 *   - výběr souboru při importu zálohy,
 *   - tlačítko Zpět (nejdřív zavírá okna v aplikaci).
 */
public class MainActivity extends Activity {

  private static final String TAG = "OOPP";
  private static final String START_URL = "https://fezyx.github.io/Swiss-formOOPP/";
  private static final String OFFLINE_URL = "file:///android_asset/offline.html";
  private static final int REQ_FILE = 1001;
  private static final int REQ_STORAGE = 1002;

  private WebView web;
  private ValueCallback<Uri[]> fileCallback;
  private boolean offlinePageLoaded = false;

  @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    WebView.setWebContentsDebuggingEnabled(true);

    web = new WebView(this);
    // Modrá firemní barva místo bílé: mezi startovním oknem a načítací
    // obrazovkou aplikace tak nic neproblikne.
    web.setBackgroundColor(Color.parseColor("#3663AE"));
    setContentView(web, new ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);          // localStorage = data aplikace v zařízení
    s.setDatabaseEnabled(true);
    s.setUseWideViewPort(true);
    s.setLoadWithOverviewMode(true);
    s.setSupportZoom(false);
    s.setBuiltInZoomControls(false);
    s.setDisplayZoomControls(false);
    s.setTextZoom(100);                    // stejná sazba jako na počítači (kvůli tisku)
    s.setMediaPlaybackRequiresUserGesture(true);
    s.setCacheMode(WebSettings.LOAD_DEFAULT);
    s.setAllowFileAccess(true);            // stránka „nemáte internet“ z APK
    s.setAllowContentAccess(true);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

    web.addJavascriptInterface(new Bridge(), "OOPPAndroid");
    web.setWebViewClient(new OoppClient());
    web.setWebChromeClient(new OoppChromeClient());

    boolean restored = false;
    if (savedInstanceState != null) {
      restored = web.restoreState(savedInstanceState) != null;
    }
    if (!restored) web.loadUrl(START_URL);
  }

  @Override
  protected void onSaveInstanceState(Bundle outState) {
    super.onSaveInstanceState(outState);
    if (web != null) web.saveState(outState);
  }

  @Override
  protected void onPause() {
    if (web != null) web.onPause();
    super.onPause();
  }

  @Override
  protected void onResume() {
    super.onResume();
    if (web != null) web.onResume();
  }

  @Override
  protected void onDestroy() {
    if (web != null) {
      web.removeJavascriptInterface("OOPPAndroid");
      web.destroy();
      web = null;
    }
    super.onDestroy();
  }

  /** Tlačítko Zpět: nejdřív se zavírají okna v aplikaci, pak se ukončí. */
  @SuppressWarnings("deprecation")
  @Override
  public void onBackPressed() {
    if (web == null) {
      super.onBackPressed();
      return;
    }
    web.evaluateJavascript(
        "(function(){try{return (window.__ooppBack && window.__ooppBack())?'true':'false';}catch(e){return 'false';}})()",
        new ValueCallback<String>() {
          @Override
          public void onReceiveValue(String value) {
            if (value == null || !value.contains("true")) finish();
          }
        });
  }

  @Override
  protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    if (requestCode == REQ_FILE) {
      Uri[] files = null;
      if (resultCode == RESULT_OK && data != null) {
        if (data.getData() != null) {
          files = new Uri[]{ data.getData() };
        } else if (data.getClipData() != null) {
          int count = data.getClipData().getItemCount();
          files = new Uri[count];
          for (int i = 0; i < count; i++) {
            files[i] = data.getClipData().getItemAt(i).getUri();
          }
        }
      }
      if (fileCallback != null) {
        fileCallback.onReceiveValue(files);
        fileCallback = null;
      }
      return;
    }
    if (requestCode == REQ_STORAGE) {
      toast(resultCode == RESULT_OK
          ? "Povolení uděleno — klepněte na export znovu."
          : "Bez povolení „Ukládání“ nelze soubor uložit.");
      return;
    }
    super.onActivityResult(requestCode, resultCode, data);
  }

  /** Navigace: aplikace zůstává v APK, cizí odkazy se otevírají v prohlížeči. */
  private class OoppClient extends WebViewClient {
    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
      Uri u = request.getUrl();
      if (u == null) return false;
      String scheme = u.getScheme() == null ? "" : u.getScheme();
      String host = u.getHost() == null ? "" : u.getHost();
      if ("file".equals(scheme)) return false;              // stránka „nemáte internet“
      if (host.endsWith("fezyx.github.io")) return false;   // samotná aplikace
      try {
        startActivity(new Intent(Intent.ACTION_VIEW, u));
      } catch (Exception e) {
        Log.w(TAG, "Odkaz nelze otevřít: " + u, e);
      }
      return true;
    }

    @Override
    public void onPageFinished(WebView view, String url) {
      super.onPageFinished(view, url);
      if (url != null && url.startsWith("http")) offlinePageLoaded = false;
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
      super.onReceivedError(view, request, error);
      if (request != null && request.isForMainFrame()) showOfflinePage();
    }
  }

  /** Když není internet a stránka není v offline paměti, ukáže se česká hláška. */
  private void showOfflinePage() {
    if (offlinePageLoaded) return;
    offlinePageLoaded = true;
    runOnUiThread(new Runnable() {
      @Override
      public void run() {
        if (web != null) web.loadUrl(OFFLINE_URL);
      }
    });
  }

  /** Dialogová okna prohlížeče (potvrzení mazání, výběr souboru, tisk). */
  private class OoppChromeClient extends WebChromeClient {
    @Override
    public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                     FileChooserParams params) {
      if (fileCallback != null) {
        fileCallback.onReceiveValue(null);
        fileCallback = null;
      }
      fileCallback = callback;
      try {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        startActivityForResult(Intent.createChooser(intent, "Vyberte soubor"), REQ_FILE);
        return true;
      } catch (Exception e) {
        Log.w(TAG, "Výběr souboru nelze otevřít", e);
        fileCallback = null;
        return false;
      }
    }

    @Override
    public boolean onConsoleMessage(ConsoleMessage msg) {
      if (msg != null) {
        Log.d(TAG, msg.message() + " (" + msg.sourceId() + ":" + msg.lineNumber() + ")");
      }
      return true;
    }

    @Override
    public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
      new AlertDialog.Builder(MainActivity.this)
          .setMessage(message)
          .setCancelable(false)
          .setPositiveButton("OK", (dialog, which) -> result.confirm())
          .show();
      return true;
    }

    @Override
    public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
      new AlertDialog.Builder(MainActivity.this)
          .setMessage(message)
          .setCancelable(false)
          .setPositiveButton("Ano", (dialog, which) -> result.confirm())
          .setNegativeButton("Ne", (dialog, which) -> result.cancel())
          .show();
      return true;
    }
  }

  /**
   * Most mezi webovou částí (index.html) a Androidem — v JS jako
   * window.OOPPAndroid. Podle něj aplikace pozná, že běží v APK
   * (isAndroidShell), a posílá sem tisk i ukládání souborů.
   */
  public class Bridge {

    /** Uloží export (PDF, CSV, zálohu JSON) do složky Stahování. */
    @JavascriptInterface
    public void saveFile(final String name, final String base64, final String mime) {
      if (base64 == null || base64.isEmpty()) {
        toastOnUi("Soubor je prázdný — export se nepovedl.");
        return;
      }
      try {
        byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
        String where = writeToDownloads(name, bytes, mime);
        toastOnUi("Uloženo: " + where);
      } catch (SecurityException se) {
        toastOnUi("Chybí povolení k ukládání — povolte ho a klepněte na export znovu.");
      } catch (Exception e) {
        Log.e(TAG, "Soubor nelze uložit", e);
        toastOnUi("Soubor se nepodařilo uložit: " + e.getMessage());
      }
    }

    /** Tisk aktuální obrazovky (knížka, potvrzení) — Android umí i PDF. */
    @JavascriptInterface
    public void printPage(final String jobName) {
      runOnUiThread(new Runnable() {
        @Override
        public void run() {
          if (web == null) return;
          try {
            String name = (jobName == null || jobName.trim().isEmpty())
                ? "Evidence OOPP"
                : jobName.trim();
            PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
            PrintAttributes attrs = new PrintAttributes.Builder()
                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                .build();
            PrintDocumentAdapter adapter = web.createPrintDocumentAdapter(name);
            pm.print(name, adapter, attrs);
          } catch (Exception e) {
            Log.e(TAG, "Tisk se nepodařil", e);
            toast("Tisk se nepodařil: " + e.getMessage());
          }
        }
      });
    }

    /** Jen pro kontrolu z webové části (isAndroidShell). */
    @JavascriptInterface
    public String appInfo() {
      return "android";
    }

    /**
     * Otevření odkazu nebo cizí aplikace (WhatsApp, poštovní klient, SMS).
     * WebView by cizí odkaz otevřel sám v sobě, proto to dělá nativní část.
     */
    @JavascriptInterface
    public void openUrl(final String url) {
      if (url == null || url.trim().isEmpty()) return;
      runOnUiThread(new Runnable() {
        @Override
        public void run() {
          try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim())));
          } catch (Exception e) {
            Log.w(TAG, "Odkaz nelze otevrit: " + url, e);
            toast("Odkaz se nepodařilo otevřít.");
          }
        }
      });
    }

    /**
     * Sdílení souboru (PDF knížky) do jiných aplikací — WhatsApp, e-mail, Drive.
     * WebView sám Web Share API neumí, proto se soubor předá systému.
     * Android 10 a novější ukáže dialog „Sdílet“; starší verze soubor uloží
     * do složky Stahování.
     */
    @JavascriptInterface
    public void shareFile(final String name, final String base64, final String mime) {
      if (base64 == null || base64.isEmpty()) {
        toastOnUi("Soubor je prázdný — není co sdílet.");
        return;
      }
      final String type = (mime == null || mime.trim().isEmpty())
          ? "application/pdf" : mime.trim();
      try {
        byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
        if (Build.VERSION.SDK_INT < 29) {
          String where = writeToDownloads(name, bytes, type);
          toastOnUi("Uloženo: " + where + " — soubor přiložte ručně.");
          return;
        }
        ContentValues values = new ContentValues();
        values.put(MediaStore.Downloads.DISPLAY_NAME, cleanFileName(name));
        values.put(MediaStore.Downloads.MIME_TYPE, type);
        values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        values.put(MediaStore.Downloads.IS_PENDING, 1);
        final Uri uri = getContentResolver()
            .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) throw new Exception("soubor nelze vytvorit");
        OutputStream os = getContentResolver().openOutputStream(uri);
        if (os == null) throw new Exception("soubor nelze otevrit");
        try {
          os.write(bytes);
          os.flush();
        } finally {
          os.close();
        }
        values.clear();
        values.put(MediaStore.Downloads.IS_PENDING, 0);
        getContentResolver().update(uri, values, null, null);
        runOnUiThread(new Runnable() {
          @Override
          public void run() {
            try {
              Intent send = new Intent(Intent.ACTION_SEND);
              send.setType(type);
              send.putExtra(Intent.EXTRA_STREAM, uri);
              send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
              startActivity(Intent.createChooser(send, "Sdílet knížku"));
            } catch (Exception e) {
              Log.e(TAG, "Sdileni se nepodarilo", e);
              toast("Sdílení se nepodařilo — soubor je ve Stahování.");
            }
          }
        });
      } catch (Exception e) {
        Log.e(TAG, "Soubor pro sdileni nelze pripravit", e);
        toastOnUi("Sdílení se nepodařilo: " + e.getMessage());
      }
    }
  }

  private String writeToDownloads(String name, byte[] data, String mime) throws Exception {
    String fileName = cleanFileName(name);
    String type = (mime == null || mime.trim().isEmpty())
        ? "application/octet-stream"
        : mime.trim();

    if (Build.VERSION.SDK_INT >= 29) {
      ContentValues values = new ContentValues();
      values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
      values.put(MediaStore.Downloads.MIME_TYPE, type);
      values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
      values.put(MediaStore.Downloads.IS_PENDING, 1);
      Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
      if (uri == null) throw new Exception("soubor nelze vytvořit");
      OutputStream os = getContentResolver().openOutputStream(uri);
      if (os == null) throw new Exception("soubor nelze otevřít");
      try {
        os.write(data);
        os.flush();
      } finally {
        os.close();
      }
      values.clear();
      values.put(MediaStore.Downloads.IS_PENDING, 0);
      getContentResolver().update(uri, values, null, null);
      return "Stahování/" + fileName;
    }

    // Android 7–9: veřejná složka Stahování, potřebuje povolení.
    if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        != PackageManager.PERMISSION_GRANTED) {
      runOnUiThread(new Runnable() {
        @Override
        public void run() {
          requestPermissions(
              new String[]{ Manifest.permission.WRITE_EXTERNAL_STORAGE }, REQ_STORAGE);
        }
      });
      throw new SecurityException("chybí povolení");
    }
    File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
    if (!dir.exists() && !dir.mkdirs()) throw new Exception("složku Stahování nelze vytvořit");
    File file = new File(dir, fileName);
    FileOutputStream fos = new FileOutputStream(file);
    try {
      fos.write(data);
      fos.flush();
    } finally {
      fos.close();
    }
    return "Stahování/" + fileName;
  }

  /** Odstraní z názvu souboru znaky, které Android v názvu nechce. */
  private String cleanFileName(String name) {
    String base = (name == null || name.trim().isEmpty())
        ? "OOPP_" + System.currentTimeMillis()
        : name.trim();
    return base.replaceAll("[\\\\/:*?\"<>|\\r\\n\\t]", "_");
  }

  private void toast(String message) {
    Toast.makeText(this, message, Toast.LENGTH_LONG).show();
  }

  private void toastOnUi(final String message) {
    runOnUiThread(new Runnable() {
      @Override
      public void run() {
        toast(message);
      }
    });
  }
}

