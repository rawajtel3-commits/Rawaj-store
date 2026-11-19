import java.net.URI

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val rawStoreUrl = providers.gradleProperty("RAWAJ_STORE_URL")
    .getOrElse("https://store.yourdomain.com")
    .trim()
    .removeSuffix("/")

val parsedHost = try {
    URI(rawStoreUrl).host ?: "store.yourdomain.com"
} catch (_: Exception) {
    "store.yourdomain.com"
}

val customPackage = providers.gradleProperty("RAWAJ_APP_PACKAGE")
    .getOrElse("com.rawaj.store")
    .trim()

val appVersionCode = providers.gradleProperty("RAWAJ_APP_VERSION_CODE")
    .getOrElse("1")
    .toIntOrNull() ?: 1

val appVersionName = providers.gradleProperty("RAWAJ_APP_VERSION_NAME")
    .getOrElse("1.0.0")
    .trim()

android {
    namespace = "com.rawaj.store"
    compileSdk = 35

    defaultConfig {
        applicationId = customPackage
        minSdk = 24
        targetSdk = 35
        versionCode = appVersionCode
        versionName = appVersionName

        buildConfigField("String", "STORE_BASE_URL", "\"$rawStoreUrl\"")
        buildConfigField("String", "STORE_HOST", "\"$parsedHost\"")
        manifestPlaceholders["storeHost"] = parsedHost
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.browser:browser:1.8.0")
}
