This project is very basic stuff and very much work in progress. So use at own risk.

The goal for this project is to create a new plugin for elastic search that helps you to gain information about the
system. I am working on the dynamic query creation. Some of the features:
- Select the index(es) to query
- Select the type(s) to query
- Select the fields to show
- Select the fields for term facets


If you do feel adventurous, copy this to the plugin folder of your elasticsearch installation in a folder with your
chosen name and within that folder _site. Than you can browse to:
http://<server>:<port>/_plugin/<the_name>/index.html

That should do the trick. If you have questions or problems, use the ticket system.

bin/elasticsearch -f -Des.config=/Users/jcoenradie/javalibs/elasticsearch/projects/gridshore/config/elasticsearch.yml