<div align="center">

  # Movie API Extension

  Extension of the IMDb clone REST API with new endpoints, additional data and accompanying Swagger documentation.

  ![MySQL](https://img.shields.io/badge/mysql-%2300f.svg?style=for-the-badge&logo=mysql&logoColor=white)&nbsp;
  ![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)&nbsp;
  [![Knex.js](https://img.shields.io/badge/Knex.js-blue?style=for-the-badge&logo=Knex.js&logoColor=White)](https://knexjs.org/)&nbsp;
  ![Swagger](https://img.shields.io/badge/-Swagger-%23Clojure?style=for-the-badge&logo=swagger&logoColor=white)&nbsp;
  ![Insomnia](https://img.shields.io/badge/Insomnia-black?style=for-the-badge&logo=insomnia&logoColor=5849BE)
  
  ![image](https://github.com/ottohellwig/movie-api-extension/assets/105997582/7e58ff2c-b630-4ab6-80f8-567fa4732294)

</div>

## Description

Movie API Extension is an improved version of the REST API used in the ![IMDb Clone](https://github.com/ottohellwig/imdb-clone/) project. The improvements include additional API endpoints and a new HTTP method, PUT. The backend database was extended with new tables in MySQL and now includes user profiles. Further, the other retrieval functions of the original API were replicated and Swagger documentation (YAML) was produced to accompany that. 

## Features

<details>
  <summary>
    <i>Click to view features</i>
  </summary>
  <p>

  - New Profile endpoint
    - GET /user/{email}/profile
    - PUT /user/{email}/profile
  - Tested in Insomnia
  - Additional profile data
  - Swagger documentation

  </p>
</details>

## Installation

1. Clone the repository.
   
   ```sh
   git clone https://github.com/ottohellwig/movie-api-extension.git
   ```

2. Install the dependencies.

   ```sh
   npm install
   ```

3. Deploy local version.

   ```sh
   npm start
   ```

4. Go to `localhost:3000`.

## Contributing

Contributions (Issues/PRs/Discussions) are the driver of improvements in projects. Any contributions you make are greatly appreciated.

## License

This work is published under [MIT License][license].

[license]: https://github.com/ottohellwig/movie-api-extension/blob/master/LICENSE

## Note

To have the table functioning, please request a demo via an issue as the REST API is restricted with a VPN.
