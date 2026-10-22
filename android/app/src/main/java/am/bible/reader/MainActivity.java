package am.bible.reader;

import android.content.res.Configuration;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Пока идёт заставка, окно бежевое; после неё красим окно под режим телефона
        getWindow().getDecorView().postDelayed(this::applyThemeBackground, 1500);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // Пользователь переключил светлый/тёмный режим телефона
        applyThemeBackground();
    }

    private void applyThemeBackground() {
        getWindow().setBackgroundDrawable(new ColorDrawable(getColor(R.color.app_bg)));
    }
}
