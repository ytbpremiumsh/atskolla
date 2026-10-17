package com.atskolla.parent;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;

/** Debug-only visual QA of the exact native layouts used by MainActivity. */
public class BrandPreviewActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        View root = findViewById(R.id.root);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        root.requestApplyInsets();
        findViewById(R.id.web).setVisibility(View.INVISIBLE);
        if (getIntent().getBooleanExtra("preview_error", false)) {
            findViewById(R.id.loading_panel).setVisibility(View.GONE);
            findViewById(R.id.error_panel).setVisibility(View.VISIBLE);
        }
    }
}
