---
title: "Structure adds scalability: a look beyond networks"
kind: essay
date: 2024-09-19
note: "A networking principle traced through databases, caches, APIs — and a Netflix device-data migration."
lang: en
featured: false
shelf: systems
draft: false
---


I am taking a course on Network Systems Foundations. In the addressing part of the internet protocol class, the professor said a quote that powerfully caught my attention:

> Given that Structure Adds Scalability

> • In Ethernet we saw tables had 1 entry per destination

> • That doesn’t scale to billions of devices worldwide

> • Solution — add structure to addresses so devices can be grouped

I love when I can reference patterns across systems in software and this one hits that spot! Let’s see which other areas this principle becomes relevant beyond network addressing:

#### **Databases**

*   Indexing: Instead of searching through every record, databases use structured indexes (e.g., B-trees, hash indexes) to quickly locate data. This allows databases to scale to billions of records while maintaining fast query performance.
*   Sharding: adds structure to data distribution, allowing for horizontal scaling.
*   Database systems like Cassandra use structured partitioning strategies to distribute data across nodes. This allows for horizontal scaling to handle massive datasets.

#### **Caching strategies**

*   Implementing structured caching layers (e.g., L1, L2, L3 caches) improves performance at scale.
*   **Hierarchical Caching:** Implementing multi-level cache structures (e.g., memory, SSD, HDD) improves performance at scale. Example: CDNs use hierarchical caching to serve content closer to users.

#### **Event-Driven architecture**

*   Structuring applications around events and message queues allows for better decoupling and scalability of components.

#### **Domain-Driven Design (DDD)**

*   Structuring software around business domains improves scalability of complex business logic.

#### **API Design**

*   Structuring APIs with clear hierarchies and versioning improves scalability and maintainability. Example: \`/api/v1/users/{userId}/posts\` provides a clear structure for accessing resources.

#### **Microservices**

*   Breaking down a monolithic application into structured, smaller services allows for better scalability.
*   Each service can be scaled independently based on its specific load.

#### **Load balancing**

*   Using algorithms (e.g., consistent hashing) for load balancing allows for better distribution of requests across servers.

#### **Containerization and Orchestration**

*   Structuring applications into containers and using orchestration tools like Kubernetes allows for better scalability and management of complex distributed systems.

### Scalability of device data at Netflix

At Netflix I worked on a large migration of an existing application storing device data. The new system needed to tackle new business use cases like games, handle a higher volume of data and each data object required to add more fields. We proposed and implemented a new data model using Protocol Buffer messages for binary data storage and used the Key Value store abstraction of Netflix’s [Data Gateway abstractions](https://netflixtechblog.medium.com/data-gateway-a-platform-for-growing-and-protecting-the-data-tier-f1ed8db8f5c6).

The use of a structured approach to data storage with protobuf format’s efficient serialization and compact data representation introduced several benefits:

*   ***Cost savings***: The new system, using Key Value service, allowed us to store significantly more data at less than 60% of the cost of our previous Cassandra clusters.
*   ***Product innovation***: The protobuf data model approach enabled additional features like granular device management, which improved synchronization between device states and user actions. It also eased the development of new functionalities, including new capabilities for device state management and offline data processing. This demonstrates how a well-structured system can scale not just in terms of data volume, but also in its ability to support evolving feature sets and use cases.
*   ***Increase maintainability***: The new structured approach leveraged the latest version of service frameworks and data gateway abstractions. This standardized, up-to-date infrastructure improved maintainability and scalability by following established best practices and receiving regular updates and making it easier to make framework updates, the new system now runs in Java 21.

Recognizing principles like *adding structure for scalability* helps us identify common & powerful patterns across different domains in software development. It expands our mental models about scalable software design and guides our approach to solving complex problems in system architecture. I am always excited to learn about new applications of this principle. How have you leveraged structure to enhance scalability in your projects?

---

*Originally published on [Medium](https://mlescaille.medium.com/structure-adds-scalability-a-look-beyond-networkd-c8cdd8b5e42f).*
