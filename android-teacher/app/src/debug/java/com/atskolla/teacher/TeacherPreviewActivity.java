package com.atskolla.teacher;
import static com.atskolla.teacher.Json.*;
public final class TeacherPreviewActivity extends TeacherActivity {
 @Override protected boolean preview(){return true;}
 @Override protected void previewStart(){try{api=new FixtureApi(this);store=new TeacherStore(api);store.initialize();selectedClass="VII A";String screen=getIntent().getStringExtra("screen");if(screen==null)screen="home";if(screen.equals("subject")){subjectAttendance(((FixtureApi)api).schedule());return;}if(screen.equals("card")){navigate("account");teacherCard();return;}if(screen.equals("login")){login();return;}if(screen.equals("wali"))mode="wali";navigate(screen);}catch(Exception e){throw new IllegalStateException(e);}}
}
