package com.gardenghi.gardenpixeleditor;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Prevent system bars (navigation buttons and status bar) from overlapping the webview
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
