// Neo4j Schema Setup

// Constraints for unique identifiers
CREATE CONSTRAINT repository_unique_name IF NOT EXISTS
FOR (r:Repository) REQUIRE r.fullName IS UNIQUE;

CREATE CONSTRAINT package_unique_id IF NOT EXISTS
FOR (p:Package) REQUIRE p.packageId IS UNIQUE;

CREATE CONSTRAINT api_unique_id IF NOT EXISTS
FOR (a:API) REQUIRE a.apiId IS UNIQUE;

CREATE CONSTRAINT service_unique_name IF NOT EXISTS
FOR (s:Service) REQUIRE s.name IS UNIQUE;

// Performance indexes
CREATE INDEX repository_type IF NOT EXISTS FOR (r:Repository) ON (r.type);
CREATE INDEX repository_owner IF NOT EXISTS FOR (r:Repository) ON (r.owner);
CREATE INDEX repository_language IF NOT EXISTS FOR (r:Repository) ON (r.primaryLanguage);

CREATE INDEX package_type IF NOT EXISTS FOR (p:Package) ON (p.type);
CREATE INDEX package_name IF NOT EXISTS FOR (p:Package) ON (p.name);

CREATE INDEX api_repository IF NOT EXISTS FOR (a:API) ON (a.repository);
CREATE INDEX api_method IF NOT EXISTS FOR (a:API) ON (a.method);

CREATE INDEX service_type IF NOT EXISTS FOR (s:Service) ON (s.type);
