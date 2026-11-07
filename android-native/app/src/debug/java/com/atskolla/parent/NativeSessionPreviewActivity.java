package com.atskolla.parent;
import org.json.JSONArray;
/** Exercises the real cached bootstrap after process restart with a network-free API. */
public final class NativeSessionPreviewActivity extends ParentActivity {
    @Override protected boolean preview(){return true;}
    @Override protected void startPreview(){api=new NativeLifecycleCheckActivity.Api(this,new JSONArray());if(token.isEmpty())login(false);else bootstrap();}
}
