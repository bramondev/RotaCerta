import java.util.Properties

fun String.asBuildConfigString() = "\"${replace("\\", "\\\\").replace("\"", "\\\"")}\""

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) {
        keystorePropertiesFile.inputStream().use(::load)
    }
}

val hasReleaseSigning =
    keystoreProperties["storeFile"] != null &&
    keystoreProperties["storePassword"] != null &&
    keystoreProperties["keyAlias"] != null &&
    keystoreProperties["keyPassword"] != null

val appBaseUrl =
    (findProperty("ROTA_CERTA_BASE_URL") as String?)
        ?.trim()
        ?.takeUnless { it.isBlank() }
        ?: "https://rotacertarbf.netlify.app"

val oneSignalAppId =
    (findProperty("ROTA_CERTA_ONE_SIGNAL_APP_ID") as String?)
        ?.trim()
        ?.takeUnless { it.isBlank() }
        ?: "977604f7-a451-4b2a-8a3c-588c9f7ca553"

android {
    namespace = "br.com.rotacerta"
    compileSdk = 35

    defaultConfig {
        applicationId = "br.com.rotacerta"
        minSdk = 24
        targetSdk = 35
        versionCode = 3
        versionName = "1.0.2"
        buildConfigField("String", "APP_BASE_URL", appBaseUrl.asBuildConfigString())
        buildConfigField("String", "ONE_SIGNAL_APP_ID", oneSignalAppId.asBuildConfigString())

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = rootProject.file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        buildConfig = true
    }
}

dependencies {

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.onesignal)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
