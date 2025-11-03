# Angular template for node

A template to generate angular webs.

Use node 22.2.0, and the 18.0.3 Angular cli version.

# Usage

    - Clone the repo
    - Docker compose up. The node modules will be installed in the image, and the web will be served in the port 4200.
    - Code your web.
    - Build your web: while the web is being served in the port 4200 (http://localhost:4200), that is, the container is running, get into the container and write: ng build. Your web will be made and stored in the volume ./web/dist/browser
