# Setting up and run env

The following is a guide on how local easily setting up the enviroment and set to run


### Run from local repository
```
curl https://pyenv.run | bash

# Optional
sudo apt-get remove --purge gdal-bin libgdal-dev
sudo apt-get autoremove

sudo add-apt-repository ppa:ubuntugis/ubuntugis-unstable
sudo apt-get update
sudo apt-get install gdal-bin libgdal-dev

# require at least libgdal 3.9.3

pyenv install 3.9.13
pyenv global 3.9.13
# added pyenv to the path
python3.9 -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate

pip install GDAL

pip install -r requirements.txt
pip install -e . # use have to install a moduleex
```

### Run from Docker
```
docker build -t mapswipe_workers .
docker run -it mapswipe_workers /bin/bash

docker run -d --name mapswipe_container mapswipe_workers
docker exec -it mapswipe_container /bin/bash
```

Base on the documentation for making sure that the dependecies are impleented run the following command

```
python -m unittest discover --verbose --start-directory tests/unittests/
```