/// <reference types="cypress" />
import "cypress-plugin-api";

Cypress.config("baseUrl", "https://dummyapi.io/data/v1");
let createdUserIds = [];

describe("User", () => {
  afterEach(() => {
    if (createdUserIds.length > 0) {
      createdUserIds.forEach((userId) => {
        cy.api({
          method: "DELETE",
          url: `/user/${userId}`,
          headers: {
            "app-id": Cypress.env("app-id"),
          },
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 404]);
        });
      });
      createdUserIds = [];
    }
  });

  let user = {
    firstName: "Jack",
    lastName: "Black",
    email: `black12dfd3s${Date.now()}@gmail.com`,
  };

  context("/user", () => {
    it("gets a list of users", () => {
      const defaultLimit = 20;
      const defaultPage = 0;

      cy.api({
        method: "GET",
        url: "/user",
        headers: {
          "app-id": Cypress.env("app-id"),
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data).length.to.be.greaterThan(1);
        expect(response.body.data[0]).to.have.keys([
          "id",
          "title",
          "firstName",
          "lastName",
          "picture",
        ]);

        // Ensure default pagination parameters
        expect(response.body).to.contain({
          limit: defaultLimit,
          page: defaultPage,
        });
      });
    });

    it("should return a paginated list of users", () => {
      const page = 2;
      const limit = 40;

      cy.api({
        method: "GET",
        url: `/user?page=${page}&limit=${limit}`,
        headers: {
          "app-id": Cypress.env("app-id"),
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.contain({ limit, page });
        expect(response.body.data.length).to.eq(limit);
      });
    });

    it("should return an empty list when the page exceeds available data", () => {
      const limit = 50;

      cy.api({
        method: "GET",
        url: `/user?page=0&limit=${limit}`,
        headers: {
          "app-id": Cypress.env("app-id"),
        },
      }).then((initialResponse) => {
        // get last page with data
        const lastPage = Math.floor(initialResponse.body.total / limit);

        cy.api({
          method: "GET",
          url: `/user?page=${lastPage + 1}&limit=${limit}`,
          headers: {
            "app-id": Cypress.env("app-id"),
          },
        }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.contain({ limit, page: lastPage + 1 });
          expect(response.body.data).to.be.an("array").and.to.have.length(0);
        });
      });
    });
  });
  context("/user/create", () => {
    it("create a user", () => {
      cy.api({
        method: "POST",
        url: "user/create",
        headers: {
          "app-id": Cypress.env("app-id"),
        },
        body: user,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.contain(user);
        expect(response.body).to.have.property("id");
        user.id = response.body.id;

        createdUserIds.push(response.body.id);
      });
    });

    it("should not allow creating a user with a duplicate email", () => {
      const duplicateUser = {
        firstName: "Jack",
        lastName: "Black",
        email: "duplicate1111@gmail.com",
      };

      // create user to check duplicate later
      cy.api({
        method: "POST",
        url: "/user/create",
        headers: {
          "app-id": Cypress.env("app-id"),
        },
        body: duplicateUser,
      }).then((response) => {
        expect(response.status).to.eq(200);

        createdUserIds.push(response.body.id);
      });

      // attempt to create user with the same email
      cy.api({
        method: "POST",
        url: "/user/create",
        headers: {
          "app-id": Cypress.env("app-id"),
        },
        body: duplicateUser,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property("error");
        expect(response.body.data.email).to.eq("Email already used");
      });
    });
  });

  context("/user/:id", () => {
    let testUser;
    beforeEach(() => {
      // create user before test
      const newUser = {
        firstName: "Jack",
        lastName: "Black",
        email: `jack${Date.now()}@gmail.com`,
      };

      cy.api({
        method: "POST",
        url: "/user/create",
        headers: {
          "app-id": Cypress.env("app-id"),
        },
        body: newUser,
      }).then((response) => {
        expect(response.status).to.eq(200);
        testUser = response.body; // save created user
      });
    });
    it("gets a user by id", () => {
      cy.api({
        method: "GET",
        url: `/user/${testUser.id}`,
        headers: {
          "app-id": Cypress.env("app-id"),
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.include(testUser);
      });
    });

    it("should return 404 for non-existing user", () => {
      const nonExistingId = 99999;
      cy.api({
        method: "GET",
        url: `/user/${nonExistingId}`,
        headers: {
          "app-id": Cypress.env("app-id"),
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(400);
      });
    });

    it("update a user", () => {
      const updatedUserData = {
        firstName: "Walter",
        lastName: "White",
      };

      cy.api({
        method: "PUT",
        url: `/user/${testUser.id}`,
        headers: {
          "app-id": Cypress.env("app-id"),
        },
        body: updatedUserData,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.include(updatedUserData);
      });
    });

    it("delete a user", () => {
      cy.api({
        method: "DELETE",
        url: `/user/${testUser.id}`,
        headers: {
          "app-id": Cypress.env("app-id"),
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.contain({ id: testUser.id });
      });

      // check if user is deleted
      cy.api({
        method: "GET",
        url: `/user/${testUser.id}`,
        failOnStatusCode: false,
        headers: {
          "app-id": Cypress.env("app-id"),
        },
      }).then((response) => {
        expect(response.status).to.eq(404);
      });
    });
  });
});
