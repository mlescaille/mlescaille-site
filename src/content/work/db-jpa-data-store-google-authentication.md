---
title: "Using a DB and JPA as Data Store for Google Authentication"
kind: essay
date: 2020-09-16
note: "Storing Google API user credentials with JPA as the datastore, from Groovy."
lang: en
featured: false
shelf: archive
draft: false
---

Hello there,

I was tasked with doing an integration to one of the Google APIs from my Groovy code. The first question that naturally arises is authentication and authorization, how to access the API, mainly because you can not even see anything useful as clients until you authenticate. As I go deep into the Google documentation I fear more and I shiver thinking who was the main audience for this documentation? Because in that moment it did not feel for me. But I overcame this dramatic instant when I got down to work and figured out how to use JPA as datastore to store user credentials in my app. Eventually I realized that using [Service accounts](https://developers.google.com/doubleclick-advertisers/service_accounts) was better for what was wanted, however since I didn’t find a lot of stuff out there about a JPA store I thought this might be useful for one of you integrating Google OAuth into your Spring project. The code was tested on Spring boot v2.2.6 and Groovy v3.0.4. The underlying DB is MySQL but that shouldn’t be very relevant for the code at hand as long as you are using JPA since I’m not doing any queries outside of common Spring Data finders.

Now let me tell what this blog post won’t help you with: understanding how OAuth2 works, Google authentication flows and how to authenticate to a particular Google API you are working with, all that info is out there:

![](../../assets/writing/db-jpa-data-store-google-authentication-1.gif)

Having the backstory out the way, let’s jump to the code.

To authenticate against Google with OAuth2 I used the [Google Auth Java library](https://developers.google.com/api-client-library/java/google-api-java-client/oauth2). The library does some things for you and your job is to implement the Google Authorization flow for which you need to pass a DataStore and a DataStoreFactory to store your Google OAuth credentials (incidentally called `StoredCredential`). Per the library documentation a datastore is necessary because:

> Most applications will need to persist the credential’s access token and/or refresh token. To persist the credential’s access and/or refresh tokens, you can provide your own implementation of [**DataStoreFactory**](https://googleapis.dev/java/google-http-client/latest/com/google/api/client/util/store/DataStoreFactory.html) with [**StoredCredential**](https://googleapis.dev/java/google-oauth-client/latest/com/google/api/client/auth/oauth2/StoredCredential.html); or you can use one of the following implementations provided by the library:

> [AppEngineDataStoreFactory](https://googleapis.dev/java/google-http-client/latest/com/google/api/client/extensions/appengine/datastore/AppEngineDataStoreFactory.html): persists the credential using the Google App Engine Data Store API.

> [MemoryDataStoreFactory](https://googleapis.dev/java/google-http-client/latest/com/google/api/client/util/store/MemoryDataStoreFactory.html): “persists” the credential in memory, which is only useful as a short-term storage for the lifetime of the process.

> [FileDataStoreFactory](https://googleapis.dev/java/google-http-client/latest/com/google/api/client/util/store/FileDataStoreFactory.html): persists the credential in a file.

None of these were relevant for my use case, so I went hunting for an implementation with a DB as a store. I found [this post](https://medium.com/@dirkvranckaert/google-authentication-with-jpa-f1c78d386c45), that was a little outdated for the versions I’m using, but it was very useful to understand what interfaces I needed to implement from the library.

I’m using Gradle as build system version 6.2.2 and these dependencies:

```groovy
implementation 'com.google.auth:google-auth-library-oauth2-http:0.17.1'
implementation ('com.google.oauth-client:google-oauth-client-jetty:1.28.0') {
		exclude group: 'org.mortbay.jetty', module: 'servlet-api' // had to exclude this but will depend on the rest of your dependencies
}
```

Let’s start with the entity definition where the credentials will be stored:

```groovy
package com.tutorial.googleeoauth.domain

import com.google.api.client.auth.oauth2.StoredCredential
import groovy.transform.CompileStatic

import javax.persistence.Entity
import javax.validation.constraints.NotNull
import java.time.LocalDateTime

/**
 * Represents credential details for Google's APIs.
 */
@Entity
@CompileStatic
class GoogleCredentialDetails extends BaseEntity {
    @NotNull
    String uuid

    Long adServerUserProfileId

    @NotNull
    String oauthClientId

    @NotNull
    String oauthClientSecret

    String accountName

    String accessToken

    String refreshToken

    Long expirationTimeMilliseconds

    public void apply(StoredCredential credential) {
        this.accessToken = credential.getAccessToken()
        this.expirationTimeMilliseconds = credential.getExpirationTimeMilliseconds()
        this.refreshToken = credential.getRefreshToken()
        this.updatedAt = LocalDateTime.now()
    }

    public StoredCredential toStoredCredential() {
        StoredCredential credential = new StoredCredential()
        credential.setAccessToken(this.accessToken)
        credential.setRefreshToken(this.refreshToken)
        credential.setExpirationTimeMilliseconds(this.expirationTimeMilliseconds)
        return credential
    }
}
```

And the repository:

```groovy
package com.tutorial.googleeoauth.repository

import com.tutorial.googleeoauth.domain.GoogleCredentialDetails
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository

/**
 * Repository for {@link GoogleCredentialDetails}. Represents credentials of Google's
 * OAuth authentication and authorization process.
 */
public interface GoogleCredentialDetailsRepository extends JpaRepository<GoogleCredentialDetails, Long> {
    Page<GoogleCredentialDetails> findAll(Pageable pageable)
    List<GoogleCredentialDetails> findAllOauthClientId()
    GoogleCredentialDetails findByOauthClientId(String clientId)
}
```

The **DataStoreFactory** is relatively simple, note that it’s making use of DbDataStore that is defined below.

```groovy
package com.tutorial.googleeoauth

import com.google.api.client.util.store.DataStore
import com.google.api.client.util.store.DataStoreFactory
import com.tutorial.googleeoauth.repository.GoogleCredentialDetailsRepository
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component

/**
 * Data store factory class required for implementing a custom data store to store credential
 * details in Google OAuth Authentication process.
 * @see {@link DbDataStore}
 */
@Component
class DbDataStoreFactory implements DataStoreFactory {
    GoogleCredentialDetailsRepository repository

    public DbDataStoreFactory(@Autowired GoogleCredentialDetailsRepository repository) {
        this.repository = repository
    }

    @Override
    def <V extends Serializable> DataStore<V> getDataStore(String id) throws IOException {
        return new DbDataStore(this, id, repository)
    }
}
```

And the DataStore implementation:

```groovy
package com.tutorial.googleeoauth

import com.google.api.client.auth.oauth2.StoredCredential
import com.google.api.client.util.store.AbstractDataStore
import com.google.api.client.util.store.DataStore
import com.tutorial.googleeoauth.domain.GoogleCredentialDetails
import com.tutorial.googleeoauth.exception.ResourceNotFoundException
import com.tutorial.googleeoauth.repository.GoogleCredentialDetailsRepository

import java.util.stream.Collectors

/**
 * Database dependent implementation of the {@link DataStore} interface for storing authentication details related
 * to Google OAuth authentication process.
 * @param <V>
 */
class DbDataStore<V extends Serializable> extends AbstractDataStore<V> {

    GoogleCredentialDetailsRepository repository

    /**
     * Get the store backed by a DB to store Google's credentials.
     * @param dataStoreFactory
     * @param id
     * @param repository
     */
    protected DbDataStore(DbDataStoreFactory dataStoreFactory, String id, GoogleCredentialDetailsRepository repository) {
        super(dataStoreFactory, id)
        this.repository = repository
    }

    /**
     * Get all the keys for this store
     * @return a list of keys this store has
     * @throws IOException
     */
    @Override
    Set<String> keySet() throws IOException {
        return repository.findAllOauthClientId()
    }

    /**
     * Get all the {@link StoredCredential} corresponding values for this store
     * @return
     * @throws IOException
     */
    @Override
    Collection<StoredCredential> values() throws IOException {
        return repository.findAll().stream().map(c -> {
           c.toStoredCredential()
        }).collect(Collectors.toList())
    }

    /**
     * Get a single value {@link StoredCredential} from the given {@code key}
     * @param key, the client id of the credentials.
     * @return the {@link StoredCredential} if exists, null otherwise
     * @throws IOException
     */
    @Override
    StoredCredential get(String key) throws IOException {
        GoogleCredentialDetails googleCredential = repository.findByOauthClientId(key)
        if (!googleCredential) {
            return null
        }
        return googleCredential.toStoredCredential()
    }

    /**
     * Set the value of the given {@code key}.
     * @param key
     * @param value
     * @return
     * @throws IOException
     */
    @Override
    DataStore<V> set(String key, V value) throws IOException {
        GoogleCredentialDetails googleCredentialDetails = repository.findByOauthClientId(key)
        if (!googleCredentialDetails) {
            googleCredentialDetails = new GoogleCredentialDetails()
            googleCredentialDetails.uuid = UUID.randomUUID().toString() // in real projects this should be in an utility class
            googleCredentialDetails.oauthClientId = value.key()
            googleCredentialDetails.oauthClientSecret = value.oauthClientSecret()
            googleCredentialDetails.accountName = value.accountName()
            googleCredentialDetails.adServerUserProfileId = value.userProfileId()
        }
        googleCredentialDetails.apply(value as StoredCredential)
        repository.save(googleCredentialDetails)
        return this
    }

    /**
     * Deletes all records in the table!
     * @return current instance
     * @throws IOException
     */
    @Override
    DataStore<StoredCredential> clear() throws IOException {
        repository.deleteAll()
        return this
    }

    /**
     * Delete the record corresponding to the given {@code key}.
     * @param key
     * @return
     * @throws IOException
     */
    @Override
    DataStore<StoredCredential> delete(String key) throws IOException {
        GoogleCredentialDetails googleCredential = repository.findByOauthClientId(key)
        if (!googleCredential) {
            throw new ResourceNotFoundException("No credential found for clientId ${key}")
        }
        repository.delete(googleCredential)
        return this
    }
}
```

Finally we can use our data store definition to pass it to the authentication flow. This code is to authenticate against [Google’s DFA and Trafficking API](https://developers.google.com/doubleclick-advertisers/getting_started), it should be translatable to other Google APIs:

```groovy
package com.tutorial.googleeoauth

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.extensions.java6.auth.oauth2.AuthorizationCodeInstalledApp;
import com.google.api.client.extensions.jetty.auth.oauth2.LocalServerReceiver;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.util.Utils;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.util.store.DataStoreFactory;
import com.google.api.services.dfareporting.Dfareporting;
import com.google.api.services.dfareporting.DfareportingScopes;

import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Paths;

import static java.nio.charset.StandardCharsets.UTF_8;


/**
 * DFA Reporting and Trafficking API factory.
 */
public class DfaReportingFactory {

  private static final HttpTransport HTTP_TRANSPORT = Utils.getDefaultTransport();
  private static final JsonFactory JSON_FACTORY = Utils.getDefaultJsonFactory();
  
  /**
   * Attempts to load user credentials from the provided client secrets file and persists data to
   * the provided data store.
   *
   * @param clientSecretsFile The path to the file containing client secrets.
   * @param dataStoreFactory the data store to use for caching credential information.
   * @return A {@link Credential} object initialized with user account credentials.
   */
  private static Credential loadUserCredentials(String clientSecretsFile, String accountName,
      DataStoreFactory dataStoreFactory) throws Exception {
     // Load client secrets JSON file.
    GoogleClientSecrets clientSecrets
    try (Reader reader = Files.newBufferedReader(Paths.get(clientSecretsFile), UTF_8)) {
      clientSecrets = GoogleClientSecrets.load(JSON_FACTORY, reader)
    }

    // Set up the authorization code flow.
    GoogleAuthorizationCodeFlow flow = new GoogleAuthorizationCodeFlow.Builder(HTTP_TRANSPORT,
        JSON_FACTORY, clientSecrets, DfareportingScopes.all())
        .setDataStoreFactory(dataStoreFactory)
        .build()

    // Authorize and persist credential information to the data store.
    return new AuthorizationCodeInstalledApp(flow, new LocalServerReceiver()).authorize(accountName)
  }

  /**
   * Performs all necessary setup steps for running requests against the API.
   * 
   * @return An initialized {@link Dfareporting} service object.
   */
  public static Dfareporting getInstance(String clientSecretsFile, String accountName,
      DataStoreFactory dataStoreFactory) throws Exception {
   
    Credential credential = loadUserCredentials(clientSecretsFile, accountName, dataStoreFactory)

    // Create Dfareporting client 
    return new Dfareporting.Builder(HTTP_TRANSPORT, JSON_FACTORY, credential).setApplicationName(
        "dfareporting-java-google-oauth-tutorial").build()
  }
}
```

And that’s about it, you have a DB Data Store for your Google Credentials in Spring using JPA and a DB to cache the credentials details.

May your DBStores work in you framework of choice. Stay safe out there!

---

*Originally published on [Medium](https://medium.com/@mlescaille/using-a-db-and-jpa-as-data-store-for-google-authentication-e1780b22e772).*
