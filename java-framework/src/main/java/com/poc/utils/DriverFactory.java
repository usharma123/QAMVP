package com.poc.utils;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

/**
 * Creates and tears down a Selenium WebDriver backed by Chrome.
 * Set system property "headless=true" for headless mode.
 */
public class DriverFactory {

    private WebDriver driver;

    public WebDriver create() {
        WebDriverManager.chromedriver().setup();
        ChromeOptions options = new ChromeOptions();
        if ("true".equalsIgnoreCase(System.getProperty("headless"))) {
            options.addArguments("--headless=new");
        }
        options.addArguments("--no-sandbox", "--disable-dev-shm-usage", "--window-size=1920,1080");
        driver = new ChromeDriver(options);
        return driver;
    }

    public void quit() {
        if (driver != null) {
            driver.quit();
            driver = null;
        }
    }
}
