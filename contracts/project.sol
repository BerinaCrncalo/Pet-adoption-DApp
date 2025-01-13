// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PetAdoption {

    address public owner;

    struct Pet {
        string name;
        string species;
        uint256 adoptionFee;
        address payable adopter;
        bool isAdopted;
    }

    struct Adoption {
        uint256 petId;
        address adopter;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(uint256 => Pet) public pets;
    mapping(uint256 => Adoption[]) public adoptions;
    uint256 public totalPets;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can call this function");
        _;
    }

    modifier validPetId(uint256 petId) {
        require(petId < totalPets, "Invalid pet ID");
        _;
    }

    event PetAdded(uint256 petId, string name, uint256 adoptionFee, address petOwner);
    event PetAdopted(uint256 petId, address adopter, uint256 amount, uint256 timestamp);
    event PetUpdated(uint256 petId, string newName, string newSpecies, uint256 newAdoptionFee);

    constructor() {
        owner = msg.sender;
    }

    function addPet(string memory _name, string memory _species, uint256 _adoptionFee) external onlyOwner {
        require(_adoptionFee > 0, "Adoption fee must be greater than zero");

        uint256 petId = totalPets++;
        pets[petId] = Pet({
            name: _name,
            species: _species,
            adoptionFee: _adoptionFee,
            adopter: payable(address(0)),
            isAdopted: false
        });

        emit PetAdded(petId, _name, _adoptionFee, msg.sender);
    }

    function adoptPet(uint256 petId) external payable validPetId(petId) {
        Pet storage pet = pets[petId];
        require(!pet.isAdopted, "Pet is already adopted");
        require(msg.value >= pet.adoptionFee, "Not enough funds for adoption");

        pet.adopter = payable(msg.sender);
        pet.isAdopted = true;

        adoptions[petId].push(Adoption({
            petId: petId,
            adopter: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        emit PetAdopted(petId, msg.sender, msg.value, block.timestamp);
    }

    function getPetDetails(uint256 petId)
        external
        view
        validPetId(petId)
        returns (
            string memory name,
            string memory species,
            address petOwner,
            uint256 adoptionFee,
            bool isAdopted
        )
    {
        Pet storage pet = pets[petId];
        return (pet.name, pet.species, pet.adopter, pet.adoptionFee, pet.isAdopted);
    }

    function getAdoptionHistory(uint256 petId) external view validPetId(petId) returns (Adoption[] memory) {
        return adoptions[petId];
    }

    function getAvailablePets() external view returns (uint256[] memory availablePetIds) {
        uint256 count = 0;

        for (uint256 i = 0; i < totalPets; i++) {
            if (!pets[i].isAdopted) {
                count++;
            }
        }

        availablePetIds = new uint256[](count);
        count = 0;

        for (uint256 i = 0; i < totalPets; i++) {
            if (!pets[i].isAdopted) {
                availablePetIds[count] = i;
                count++;
            }
        }

        return availablePetIds;
    }

    function updatePet(uint256 petId, string memory newName, string memory newSpecies, uint256 newAdoptionFee)
        external
        onlyOwner
        validPetId(petId)
    {
        require(newAdoptionFee > 0, "Adoption fee must be greater than zero");

        Pet storage pet = pets[petId];
        pet.name = newName;
        pet.species = newSpecies;
        pet.adoptionFee = newAdoptionFee;

        emit PetUpdated(petId, newName, newSpecies, newAdoptionFee);
    }

    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner).transfer(balance);
    }
}
