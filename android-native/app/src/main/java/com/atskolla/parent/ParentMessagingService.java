package com.atskolla.parent;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public final class ParentMessagingService extends FirebaseMessagingService {
 @Override public void onNewToken(String token){ParentPush.sync(this,token);}
 @Override public void onMessageReceived(RemoteMessage message){ParentPush.receive(this,message.getData());}
 @Override public void onDeletedMessages(){ParentNotificationJob.schedule(this);}
}
