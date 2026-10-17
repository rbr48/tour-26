# Capacitor discovers plugins and their methods by annotation and reflection.
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}
-keep class com.getcapacitor.** { *; }
-keep class com.izhaanintellect.tour2026.** { *; }
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod, SourceFile, LineNumberTable

# WebView JavaScript bridge.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase and Google Sign-In are reflection-heavy.
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Capacitor Firebase Authentication optional providers (Facebook, Play Games, etc.)
-dontwarn com.facebook.**
-keep class io.capawesome.capacitorjs.plugins.firebase.authentication.** { *; }
-dontwarn io.capawesome.capacitorjs.plugins.firebase.authentication.**

# AndroidX Credential Manager & Google Identity
-keep class androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }
-dontwarn androidx.credentials.**
-dontwarn com.google.android.libraries.identity.googleid.**
