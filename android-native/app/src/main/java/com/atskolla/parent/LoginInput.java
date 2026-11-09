package com.atskolla.parent;

/** Canonical values sent to the login API, independent of visual grouping. */
final class LoginInput {
    static String digits(String value){return value==null?"":value.replaceAll("[^0-9]","");}
    static String phone(String value){String p=digits(value);if(p.startsWith("0"))return "62"+p.substring(1);if(p.startsWith("8"))return "62"+p;return p;}
    static boolean validPhone(String value){return value.matches("628[0-9]{7,12}");}
    private LoginInput(){}
}
