# celer-compiler
Bundler for celer route engine.

This is both a tool for bundling human-reable route in yaml into JSON object, and a submodule for the route engine to process the bundled route.

For this reason, the core component of the tool is written in Typescript, with a python wrapper for standalone usage.

**Users**: please refer to [Standalone Use](#standalone-use) and [Working with Route Script](#working-with-route-script) sections
**Developers**: please also refer to [Developer Use](#developer-use) section

# Standalone Use
You need to install the following python modules:
- pip install pyyaml
- pip install dukpy
- pip install watchdog

Download `gbundle.py` and `gbundle-watch.py` from the release page.

### `gbundle.py`
This script takes in yaml route and emits JSON object

### `gbundle-watch.py`
This script takes in yaml route and emits JSON object, and also hosts it on localhost. You can then test it with celer-engine using the `DevPort` query parameter

# Developer Use
There are three scripts that are meant for developers to use
### `build.py`
This script builds the other scripts from python source

### `gtest-watch.py`
This script is like `gbundle.py`, but recompiles the bundler on file change. It also bundles the test route and compare it against the expected JSON.

Use this if you are editing on the bundler it self

### `gdev-watch.py`
This script is like `gbundle-watch.py`, but it recompiles the bundler on file change instead of using a pre-compiled bundler.

Use this if you are working on the bundler and doing integration testing with the engine.

# Working with Route Script

## Getting Started
The basic format of the route script is like this:
```yaml
Project: 
  Name: My Project
  Authors: [Your Name]
  Version: "1.2.3"
  Description: An example project
  Url: something.something.else

Route:
  - Section 1:
    - Get the sword
    - Get the shield
    - Do some quests
  - Section 2:
    - Kill the boss
```
Copy and paste the content into `myroute.yaml`, and then run `gbundle-watch.py myroute.yaml`, you can then use the engine to render the doc [(link)](https://itntpiston.github.io/celer?DevPort=2222)

## Project Section
Project section is this
```yaml
Project: 
  Name: My Project
  Authors: [Your Name]
  Version: "1.2.3"
  Description: An example project
  Url: something.something.else
```
This section defines the metadata of the route and is required

## Route Section
The Route section defines the route itself. The route is an array of sections, and each section is a section name and an array of steps
```yaml
Route: # route object
  # array of sections
  - Section 1: # section name
    # array of steps
    - Get the sword
    - Get the shield
    - Do some quests
  - Section 2:
    - Kill the boss
```

Steps can also exist outside of sections
```yaml
Route: # route object
  - some steps
  - outside
  - section
  - Section 1:
    - steps inside section
```



