package com.atskolla.parent;
import org.json.*;
final class StudentSelection {
    static String byCard(JSONArray students,String card){String digits=card.replaceAll("[^0-9]","");if(digits.isEmpty())return "";for(int i=0;i<students.length();i++){JSONObject student=students.optJSONObject(i);if(student!=null&&digits.equals(student.optString("card_number").replaceAll("[^0-9]","")))return student.optString("id");}return "";}
}
